// DTO for reconciling a bank transaction
import { IsOptional, IsNumber } from 'class-validator';

export class ReconcileTransactionDto {
  @IsOptional()
  @IsNumber()
  journal_entry_id?: number;

  @IsOptional()
  @IsNumber()
  fiscal_period_id?: number;
}
