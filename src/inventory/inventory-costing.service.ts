// Inventory Costing Service — FIFO, LIFO, Average Cost calculations
import { Injectable, BadRequestException } from '@nestjs/common';
import { Knex } from 'knex';

@Injectable()
export class InventoryCostingService {
  // Get current stock quantity for a product at a location
  async getStock(trx: Knex.Transaction, productId: number, locationId: number): Promise<number> {
    const result = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .sum('quantity as total')
      .first() as Record<string, unknown> | undefined;
    return Number(result?.total) || 0;
  }

  // Get total stock across all locations
  async getTotalStock(trx: Knex.Transaction, productId: number): Promise<number> {
    const result = await trx('inventory_transactions')
      .where({ product_id: productId })
      .sum('quantity as total')
      .first() as Record<string, unknown> | undefined;
    return Number(result?.total) || 0;
  }

  // Get stock by location for a product
  async getStockByLocation(trx: Knex.Transaction, productId: number): Promise<Record<string, unknown>[]> {
    return trx('inventory_transactions')
      .where({ product_id: productId })
      .groupBy('location_id')
      .select('location_id')
      .sum('quantity as quantity') as Promise<Record<string, unknown>[]>;
  }

  // FIFO cost calculation — consume oldest lots first
  async calculateFifoCost(
    trx: Knex.Transaction,
    productId: number,
    locationId: number,
    quantityToConsume: number,
  ): Promise<{ totalCost: number; layers: { quantity: number; unitCost: number }[] }> {
    // Get all positive (purchase) transactions ordered by date ASC (oldest first)
    const purchases = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .where('quantity', '>', 0)
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    // Get all consumption transactions to calculate remaining in each layer
    const consumptions = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .where('quantity', '<', 0)
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    // Build layers with remaining quantities
    let totalConsumed = consumptions.reduce((sum, c) => sum + Math.abs(Number(c.quantity)), 0);
    const layers: { quantity: number; unitCost: number }[] = [];

    for (const p of purchases) {
      const pQty = Number(p.quantity);
      if (totalConsumed >= pQty) {
        totalConsumed -= pQty;
        continue;
      }
      const remaining = pQty - totalConsumed;
      totalConsumed = 0;
      layers.push({ quantity: remaining, unitCost: Number(p.unit_cost) });
    }

    // Consume from layers FIFO
    let remaining = quantityToConsume;
    let totalCost = 0;
    const consumed: { quantity: number; unitCost: number }[] = [];

    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, layer.quantity);
      totalCost += Math.round(take * layer.unitCost * 100) / 100;
      consumed.push({ quantity: take, unitCost: layer.unitCost });
      remaining -= take;
    }

    if (remaining > 0) throw new BadRequestException('Insufficient stock for FIFO consumption');
    return { totalCost, layers: consumed };
  }

  // LIFO cost calculation — consume newest lots first
  async calculateLifoCost(
    trx: Knex.Transaction,
    productId: number,
    locationId: number,
    quantityToConsume: number,
  ): Promise<{ totalCost: number; layers: { quantity: number; unitCost: number }[] }> {
    // Same approach but consume from newest first
    const purchases = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .where('quantity', '>', 0)
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    const consumptions = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .where('quantity', '<', 0)
      .orderBy('created_at', 'asc')
      .select('*') as Record<string, unknown>[];

    let totalConsumed = consumptions.reduce((sum, c) => sum + Math.abs(Number(c.quantity)), 0);
    const layers: { quantity: number; unitCost: number }[] = [];

    for (const p of purchases) {
      const pQty = Number(p.quantity);
      if (totalConsumed >= pQty) { totalConsumed -= pQty; continue; }
      const remaining = pQty - totalConsumed;
      totalConsumed = 0;
      layers.push({ quantity: remaining, unitCost: Number(p.unit_cost) });
    }

    // Consume from layers LIFO (reverse)
    let remaining = quantityToConsume;
    let totalCost = 0;
    const consumed: { quantity: number; unitCost: number }[] = [];

    for (let i = layers.length - 1; i >= 0; i--) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, layers[i].quantity);
      totalCost += Math.round(take * layers[i].unitCost * 100) / 100;
      consumed.push({ quantity: take, unitCost: layers[i].unitCost });
      remaining -= take;
    }

    if (remaining > 0) throw new BadRequestException('Insufficient stock for LIFO consumption');
    return { totalCost, layers: consumed };
  }

  // Average cost calculation
  async calculateAverageCost(
    trx: Knex.Transaction,
    productId: number,
    locationId: number,
    quantityToConsume: number,
  ): Promise<{ totalCost: number; unitCost: number }> {
    // Get total value and quantity of current inventory
    const result = await trx('inventory_transactions')
      .where({ product_id: productId, location_id: locationId })
      .select(
        trx.raw('SUM(quantity) as total_qty'),
        trx.raw('SUM(total_cost) as total_value'),
      )
      .first() as Record<string, unknown> | undefined;

    const totalQty = Number(result?.total_qty) || 0;
    const totalValue = Number(result?.total_value) || 0;

    if (totalQty < quantityToConsume) throw new BadRequestException('Insufficient stock for average cost consumption');

    const avgCost = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : 0;
    const totalCost = Math.round(quantityToConsume * avgCost * 100) / 100;

    return { totalCost, unitCost: avgCost };
  }

  // Get inventory valuation for all products in a tenant
  async getInventoryValuation(trx: Knex.Transaction): Promise<Record<string, unknown>[]> {
    return trx('inventory_transactions as it')
      .join('products as p', 'it.product_id', 'p.id')
      .groupBy('p.id', 'p.sku', 'p.name', 'p.costing_method')
      .select(
        'p.id as product_id',
        'p.sku',
        'p.name',
        'p.costing_method',
      )
      .sum('it.quantity as total_quantity')
      .sum('it.total_cost as total_value')
      .having(trx.raw('SUM(it.quantity)'), '>', 0) as Promise<Record<string, unknown>[]>;
  }
}
