#!/usr/bin/env bash
# MA Finance Hub — Full demo data seed for VM deployment
# Usage: ./scripts/vm-seed-full-demo.sh
#
# This script:
#   1. Runs vm-seed-demo.sh to create base tenant, user, GAAP chart
#   2. Inserts comprehensive demo data across all modules
#
# Idempotent: uses ON CONFLICT DO NOTHING and conditional inserts.
# Runs as postgres superuser to bypass RLS.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="docker-compose.vm.yml"
ENV_FILE=".env.vm"

echo "=== Step 1: Running base demo seed ==="
"$SCRIPT_DIR/vm-seed-demo.sh"

echo ""
echo "=== Step 2: Seeding full demo data ==="

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres psql -U postgres -d ma_finance_hub <<'EOSQL'
-- ============================================================
-- MA Finance Hub — Full Demo Data Seed
-- Runs as postgres superuser (bypasses RLS)
-- ============================================================
BEGIN;

-- ── Helper: get user_id and fiscal_period_id ──
DO $$
DECLARE
  v_user_id bigint;
  v_fp_id bigint;
  v_chart_id bigint;
  -- account IDs
  a_cash bigint; a_checking bigint; a_savings bigint; a_ar bigint;
  a_inventory bigint; a_prepaid bigint; a_equipment bigint; a_vehicles bigint;
  a_accum_depr bigint; a_ap bigint; a_revenue bigint; a_service_rev bigint;
  a_cogs bigint; a_direct_labor bigint; a_salaries bigint;
  a_office_supplies bigint; a_depr_expense bigint; a_software bigint;
  -- contact IDs
  c_acme bigint; c_techvision bigint; c_stellar bigint; c_green bigint; c_medpro bigint;
  c_office_depot bigint; c_dell bigint; c_aws bigint; c_adobe bigint; c_staples bigint;
  -- product IDs
  p_widget_pro bigint; p_widget_basic bigint; p_svc_premium bigint; p_svc_consult bigint;
  p_raw_steel bigint; p_copper_wire bigint; p_assembled bigint; p_supplies bigint;
  -- location IDs
  loc_main bigint; loc_store bigint; loc_workshop bigint;
  -- bank account IDs
  ba_chase bigint; ba_wells bigint;
  -- employee IDs
  emp_smith bigint; emp_garcia bigint; emp_chen bigint; emp_johnson bigint;
  -- other IDs
  v_inv_id bigint; v_je_id bigint; v_bom_id bigint; v_wo_id bigint;
  v_pipeline_id bigint; v_stage_id bigint; v_budget_id bigint;
  v_payroll_id bigint;
BEGIN

-- ── Resolve user and fiscal period ──
SELECT id INTO v_user_id FROM users WHERE email = 'admin@demo.com' LIMIT 1;
SELECT id INTO v_fp_id FROM fiscal_periods WHERE tenant_id = 1 LIMIT 1;
SELECT id INTO v_chart_id FROM chart_of_accounts WHERE tenant_id = 1 LIMIT 1;

IF v_user_id IS NULL THEN
  RAISE EXCEPTION 'Demo user not found. Run vm-seed-demo.sh first.';
END IF;

-- ── Resolve account IDs from GAAP chart ──
SELECT id INTO a_cash FROM accounts WHERE tenant_id = 1 AND account_code = '1000';
SELECT id INTO a_checking FROM accounts WHERE tenant_id = 1 AND account_code = '1020';
SELECT id INTO a_savings FROM accounts WHERE tenant_id = 1 AND account_code = '1050';
SELECT id INTO a_ar FROM accounts WHERE tenant_id = 1 AND account_code = '1100';
SELECT id INTO a_inventory FROM accounts WHERE tenant_id = 1 AND account_code = '1200';
SELECT id INTO a_prepaid FROM accounts WHERE tenant_id = 1 AND account_code = '1300';
SELECT id INTO a_equipment FROM accounts WHERE tenant_id = 1 AND account_code = '1500';
SELECT id INTO a_vehicles FROM accounts WHERE tenant_id = 1 AND account_code = '1510';
SELECT id INTO a_accum_depr FROM accounts WHERE tenant_id = 1 AND account_code = '1600';
SELECT id INTO a_ap FROM accounts WHERE tenant_id = 1 AND account_code = '2000';
SELECT id INTO a_revenue FROM accounts WHERE tenant_id = 1 AND account_code = '4000';
SELECT id INTO a_service_rev FROM accounts WHERE tenant_id = 1 AND account_code = '4100';
SELECT id INTO a_cogs FROM accounts WHERE tenant_id = 1 AND account_code = '5000';
SELECT id INTO a_direct_labor FROM accounts WHERE tenant_id = 1 AND account_code = '5100';
SELECT id INTO a_salaries FROM accounts WHERE tenant_id = 1 AND account_code = '6100';
SELECT id INTO a_office_supplies FROM accounts WHERE tenant_id = 1 AND account_code = '6300';
SELECT id INTO a_depr_expense FROM accounts WHERE tenant_id = 1 AND account_code = '6500';
SELECT id INTO a_software FROM accounts WHERE tenant_id = 1 AND account_code = '6600';

-- ────────────────────────────────────────────────
-- TENANT SETTINGS
-- ────────────────────────────────────────────────
INSERT INTO tenant_settings (tenant_id, company_name, company_email, company_phone,
  company_address_line1, company_city, company_state, company_zip, company_country,
  tax_id, default_currency, invoice_prefix, invoice_next_number, expense_prefix, expense_next_number)
VALUES (1, 'Demo Company', 'info@democompany.com', '(555) 100-0000',
  '100 Main Street', 'Austin', 'TX', '78701', 'US',
  '12-3456789', 'USD', 'INV', 7, 'EXP', 9)
ON CONFLICT (tenant_id) DO NOTHING;

-- ────────────────────────────────────────────────
-- CONTACTS (10)
-- ────────────────────────────────────────────────
INSERT INTO contacts (tenant_id, type, company_name, first_name, last_name, email, phone, city, state, zip) VALUES
  (1,'customer','Acme Corp','Robert','Johnson','robert@acmecorp.com','(555) 201-0001','Dallas','TX','75201'),
  (1,'customer','TechVision Inc','Sarah','Williams','sarah@techvision.io','(555) 202-0002','San Francisco','CA','94105'),
  (1,'customer','Stellar Design','Emily','Chen','emily@stellardesign.com','(555) 203-0003','Portland','OR','97201'),
  (1,'customer','Green Energy Solutions','Michael','Brown','michael@greenenergy.com','(555) 204-0004','Denver','CO','80202'),
  (1,'customer','MedPro Healthcare','Lisa','Martinez','lisa@medprohc.com','(555) 205-0005','Houston','TX','77002'),
  (1,'vendor','Office Depot','James','Wilson','orders@officedepot.com','(555) 301-0001','Boca Raton','FL','33431'),
  (1,'vendor','Dell Technologies','Karen','Lee','enterprise@dell.com','(555) 302-0002','Round Rock','TX','78682'),
  (1,'vendor','AWS','David','Taylor','billing@aws.amazon.com','(555) 303-0003','Seattle','WA','98109'),
  (1,'vendor','Adobe Systems','Patricia','Davis','accounts@adobe.com','(555) 304-0004','San Jose','CA','95110'),
  (1,'vendor','Staples','Thomas','Anderson','business@staples.com','(555) 305-0005','Framingham','MA','01702')
ON CONFLICT DO NOTHING;

SELECT id INTO c_acme FROM contacts WHERE tenant_id = 1 AND company_name = 'Acme Corp' LIMIT 1;
SELECT id INTO c_techvision FROM contacts WHERE tenant_id = 1 AND company_name = 'TechVision Inc' LIMIT 1;
SELECT id INTO c_stellar FROM contacts WHERE tenant_id = 1 AND company_name = 'Stellar Design' LIMIT 1;
SELECT id INTO c_green FROM contacts WHERE tenant_id = 1 AND company_name = 'Green Energy Solutions' LIMIT 1;
SELECT id INTO c_medpro FROM contacts WHERE tenant_id = 1 AND company_name = 'MedPro Healthcare' LIMIT 1;
SELECT id INTO c_office_depot FROM contacts WHERE tenant_id = 1 AND company_name = 'Office Depot' LIMIT 1;
SELECT id INTO c_dell FROM contacts WHERE tenant_id = 1 AND company_name = 'Dell Technologies' LIMIT 1;
SELECT id INTO c_aws FROM contacts WHERE tenant_id = 1 AND company_name = 'AWS' LIMIT 1;
SELECT id INTO c_adobe FROM contacts WHERE tenant_id = 1 AND company_name = 'Adobe Systems' LIMIT 1;
SELECT id INTO c_staples FROM contacts WHERE tenant_id = 1 AND company_name = 'Staples' LIMIT 1;

-- ────────────────────────────────────────────────
-- PRODUCTS (8)
-- ────────────────────────────────────────────────
INSERT INTO products (tenant_id, sku, name, type, costing_method, sale_price, purchase_price,
  revenue_account_id, cogs_account_id, inventory_account_id, reorder_point) VALUES
  (1,'WGT-001','Widget Pro','inventory','fifo',49.99,22.50,a_revenue,a_cogs,a_inventory,10),
  (1,'WGT-002','Widget Basic','inventory','average_cost',29.99,12.00,a_revenue,a_cogs,a_inventory,20),
  (1,'SVC-001','Premium Service Pack','service',NULL,199.99,NULL,a_service_rev,NULL,NULL,NULL),
  (1,'SVC-002','Consulting Hour','service',NULL,150.00,NULL,a_service_rev,NULL,NULL,NULL),
  (1,'RAW-001','Raw Steel Sheet','inventory','lifo',NULL,45.00,NULL,a_cogs,a_inventory,50),
  (1,'RAW-002','Copper Wire 100ft','inventory','fifo',NULL,32.00,NULL,a_cogs,a_inventory,25),
  (1,'ASM-001','Assembled Unit X','inventory','average_cost',299.99,NULL,a_revenue,a_cogs,a_inventory,NULL),
  (1,'SUP-001','Office Supplies Bundle','non_inventory',NULL,75.00,40.00,a_revenue,NULL,NULL,NULL)
ON CONFLICT (tenant_id, sku) DO NOTHING;

SELECT id INTO p_widget_pro FROM products WHERE tenant_id = 1 AND sku = 'WGT-001';
SELECT id INTO p_widget_basic FROM products WHERE tenant_id = 1 AND sku = 'WGT-002';
SELECT id INTO p_svc_premium FROM products WHERE tenant_id = 1 AND sku = 'SVC-001';
SELECT id INTO p_svc_consult FROM products WHERE tenant_id = 1 AND sku = 'SVC-002';
SELECT id INTO p_raw_steel FROM products WHERE tenant_id = 1 AND sku = 'RAW-001';
SELECT id INTO p_copper_wire FROM products WHERE tenant_id = 1 AND sku = 'RAW-002';
SELECT id INTO p_assembled FROM products WHERE tenant_id = 1 AND sku = 'ASM-001';
SELECT id INTO p_supplies FROM products WHERE tenant_id = 1 AND sku = 'SUP-001';

-- ────────────────────────────────────────────────
-- INVENTORY LOCATIONS (3)
-- ────────────────────────────────────────────────
INSERT INTO inventory_locations (tenant_id, name, address, is_default) VALUES
  (1, 'Main Warehouse', '200 Industrial Blvd, Austin TX 78702', true),
  (1, 'Store Front', '100 Main Street, Austin TX 78701', false),
  (1, 'Workshop', '210 Industrial Blvd, Austin TX 78702', false)
ON CONFLICT DO NOTHING;

SELECT id INTO loc_main FROM inventory_locations WHERE tenant_id = 1 AND name = 'Main Warehouse' LIMIT 1;
SELECT id INTO loc_store FROM inventory_locations WHERE tenant_id = 1 AND name = 'Store Front' LIMIT 1;
SELECT id INTO loc_workshop FROM inventory_locations WHERE tenant_id = 1 AND name = 'Workshop' LIMIT 1;

-- ────────────────────────────────────────────────
-- INVENTORY TRANSACTIONS (initial stock)
-- ────────────────────────────────────────────────
-- Only insert if no transactions exist yet for these products
IF NOT EXISTS (SELECT 1 FROM inventory_transactions WHERE tenant_id = 1 AND product_id = p_widget_pro LIMIT 1) THEN
  INSERT INTO inventory_transactions (tenant_id, product_id, location_id, transaction_type, quantity, unit_cost, total_cost, date, notes, created_by) VALUES
    (1, p_widget_pro, loc_main, 'purchase_receipt', 100, 22.50, 2250.00, CURRENT_DATE - INTERVAL '30 days', 'Initial stock - Main Warehouse', v_user_id),
    (1, p_widget_pro, loc_store, 'purchase_receipt', 20, 22.50, 450.00, CURRENT_DATE - INTERVAL '30 days', 'Initial stock - Store Front', v_user_id),
    (1, p_widget_basic, loc_main, 'purchase_receipt', 200, 12.00, 2400.00, CURRENT_DATE - INTERVAL '30 days', 'Initial stock - Main Warehouse', v_user_id),
    (1, p_raw_steel, loc_workshop, 'purchase_receipt', 500, 45.00, 22500.00, CURRENT_DATE - INTERVAL '30 days', 'Initial stock - Workshop', v_user_id),
    (1, p_copper_wire, loc_workshop, 'purchase_receipt', 100, 32.00, 3200.00, CURRENT_DATE - INTERVAL '30 days', 'Initial stock - Workshop', v_user_id);
END IF;

-- ────────────────────────────────────────────────
-- INVOICES (6) with lines and journal entries
-- ────────────────────────────────────────────────

-- INV-0001: Acme Corp, 50x Widget Pro, $2499.50, paid
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0001') THEN
  -- Journal entry for paid invoice
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'INV-0001', 'Payment received - Acme Corp', 'posted', CURRENT_DATE - INTERVAL '30 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_cash, 2499.50, 0, 'Payment: INV-0001 Acme Corp'),
    (1, v_je_id, a_revenue, 0, 2499.50, 'Revenue: INV-0001 Acme Corp');

  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, paid_date, paid_amount, journal_entry_id, contact_id, created_by)
  VALUES (1, 'INV-0001', 'Acme Corp', 'robert@acmecorp.com',
    CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days',
    'paid', 2499.50, 0, 0, 2499.50, CURRENT_DATE - INTERVAL '30 days', 2499.50, v_je_id, c_acme, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Widget Pro (WGT-001)', 50, 49.99, 2499.50, a_revenue, 1);
END IF;

-- INV-0002: TechVision, 30x Widget Basic, $899.70, paid
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0002') THEN
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'INV-0002', 'Payment received - TechVision Inc', 'posted', CURRENT_DATE - INTERVAL '15 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_cash, 899.70, 0, 'Payment: INV-0002 TechVision'),
    (1, v_je_id, a_revenue, 0, 899.70, 'Revenue: INV-0002 TechVision');

  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, paid_date, paid_amount, journal_entry_id, contact_id, created_by)
  VALUES (1, 'INV-0002', 'TechVision Inc', 'sarah@techvision.io',
    CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days',
    'paid', 899.70, 0, 0, 899.70, CURRENT_DATE - INTERVAL '15 days', 899.70, v_je_id, c_techvision, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Widget Basic (WGT-002)', 30, 29.99, 899.70, a_revenue, 1);
END IF;

-- INV-0003: Stellar Design, 3x Premium Service Pack, $599.97, sent
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0003') THEN
  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, contact_id, created_by)
  VALUES (1, 'INV-0003', 'Stellar Design', 'emily@stellardesign.com',
    CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days',
    'sent', 599.97, 0, 0, 599.97, c_stellar, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Premium Service Pack (SVC-001)', 3, 199.99, 599.97, a_service_rev, 1);
END IF;

-- INV-0004: Green Energy, 10x Consulting Hour, $1500.00, sent
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0004') THEN
  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, contact_id, created_by)
  VALUES (1, 'INV-0004', 'Green Energy Solutions', 'michael@greenenergy.com',
    CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days',
    'sent', 1500.00, 0, 0, 1500.00, c_green, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Consulting Hour (SVC-002)', 10, 150.00, 1500.00, a_service_rev, 1);
END IF;

-- INV-0005: Acme Corp, 40x Widget Basic, $1199.60, sent (overdue)
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0005') THEN
  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, contact_id, created_by)
  VALUES (1, 'INV-0005', 'Acme Corp', 'robert@acmecorp.com',
    CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '15 days',
    'sent', 1199.60, 0, 0, 1199.60, c_acme, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Widget Basic (WGT-002)', 40, 29.99, 1199.60, a_revenue, 1);
END IF;

-- INV-0006: MedPro Healthcare, 25x Widget Basic, $749.75, draft
IF NOT EXISTS (SELECT 1 FROM invoices WHERE tenant_id = 1 AND invoice_number = 'INV-0006') THEN
  INSERT INTO invoices (tenant_id, invoice_number, customer_name, customer_email, issue_date, due_date,
    status, subtotal, tax_rate, tax_amount, total, contact_id, created_by)
  VALUES (1, 'INV-0006', 'MedPro Healthcare', 'lisa@medprohc.com',
    CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
    'draft', 749.75, 0, 0, 749.75, c_medpro, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO invoice_lines (invoice_id, tenant_id, description, quantity, unit_price, amount, account_id, sort_order)
  VALUES (v_inv_id, 1, 'Widget Basic (WGT-002)', 25, 29.99, 749.75, a_revenue, 1);
END IF;

-- ────────────────────────────────────────────────
-- EXPENSES (8) with journal entries for posted ones
-- ────────────────────────────────────────────────

-- EXP-0001: Office Depot, $342.50, Office Supplies, posted
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0001') THEN
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'EXP-0001', 'Office Supplies - Office Depot', 'posted', CURRENT_DATE - INTERVAL '20 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_office_supplies, 342.50, 0, 'Office Supplies - Office Depot'),
    (1, v_je_id, a_cash, 0, 342.50, 'Cash payment - EXP-0001');
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id, payment_account_id,
    amount, description, status, journal_entry_id, contact_id, created_by)
  VALUES (1, 'EXP-0001', CURRENT_DATE - INTERVAL '20 days', 'Office Depot', 'Office Supplies',
    a_office_supplies, a_cash, 342.50, 'Printer paper, pens, binders', 'posted', v_je_id, c_office_depot, v_user_id);
END IF;

-- EXP-0002: AWS, $1247.83, Software/Tech, posted
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0002') THEN
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'EXP-0002', 'AWS Cloud Services', 'posted', CURRENT_DATE - INTERVAL '15 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_software, 1247.83, 0, 'AWS Cloud Services'),
    (1, v_je_id, a_cash, 0, 1247.83, 'Cash payment - EXP-0002');
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id, payment_account_id,
    amount, description, status, journal_entry_id, contact_id, created_by)
  VALUES (1, 'EXP-0002', CURRENT_DATE - INTERVAL '15 days', 'AWS', 'Software/Tech',
    a_software, a_cash, 1247.83, 'Monthly cloud hosting and services', 'posted', v_je_id, c_aws, v_user_id);
END IF;

-- EXP-0003: Adobe, $659.88, Software/Tech, posted
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0003') THEN
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'EXP-0003', 'Adobe Creative Cloud', 'posted', CURRENT_DATE - INTERVAL '10 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_software, 659.88, 0, 'Adobe Creative Cloud annual'),
    (1, v_je_id, a_cash, 0, 659.88, 'Cash payment - EXP-0003');
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id, payment_account_id,
    amount, description, status, journal_entry_id, contact_id, created_by)
  VALUES (1, 'EXP-0003', CURRENT_DATE - INTERVAL '10 days', 'Adobe Systems', 'Software/Tech',
    a_software, a_cash, 659.88, 'Creative Cloud annual subscription', 'posted', v_je_id, c_adobe, v_user_id);
END IF;

-- EXP-0004: Dell, $1899.00, Equipment, approved
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0004') THEN
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id,
    amount, description, status, approved_by, contact_id, created_by)
  VALUES (1, 'EXP-0004', CURRENT_DATE - INTERVAL '5 days', 'Dell Technologies', 'Equipment',
    a_equipment, 1899.00, 'Laptop for new developer', 'approved', v_user_id, c_dell, v_user_id);
END IF;

-- EXP-0005: Staples, $89.99, Office Supplies, pending
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0005') THEN
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id,
    amount, description, status, contact_id, created_by)
  VALUES (1, 'EXP-0005', CURRENT_DATE - INTERVAL '3 days', 'Staples', 'Office Supplies',
    a_office_supplies, 89.99, 'Desk organizers and labels', 'pending', c_staples, v_user_id);
END IF;

-- EXP-0006: Office Depot, $549.98, Furniture, posted
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0006') THEN
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'EXP-0006', 'Office Furniture - Office Depot', 'posted', CURRENT_DATE - INTERVAL '25 days')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_equipment, 549.98, 0, 'Office Furniture purchase'),
    (1, v_je_id, a_cash, 0, 549.98, 'Cash payment - EXP-0006');
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id, payment_account_id,
    amount, description, status, journal_entry_id, contact_id, created_by)
  VALUES (1, 'EXP-0006', CURRENT_DATE - INTERVAL '25 days', 'Office Depot', 'Furniture',
    a_equipment, a_cash, 549.98, 'Standing desk and ergonomic chair', 'posted', v_je_id, c_office_depot, v_user_id);
END IF;

-- EXP-0007: AWS, $1312.45, Software/Tech, pending
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0007') THEN
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id,
    amount, description, status, contact_id, created_by)
  VALUES (1, 'EXP-0007', CURRENT_DATE - INTERVAL '2 days', 'AWS', 'Software/Tech',
    a_software, 1312.45, 'Cloud services - increased usage', 'pending', c_aws, v_user_id);
END IF;

-- EXP-0008: Dell, $798.00, Equipment, approved
IF NOT EXISTS (SELECT 1 FROM expenses WHERE tenant_id = 1 AND expense_number = 'EXP-0008') THEN
  INSERT INTO expenses (tenant_id, expense_number, date, vendor_name, category, account_id,
    amount, description, status, approved_by, contact_id, created_by)
  VALUES (1, 'EXP-0008', CURRENT_DATE - INTERVAL '1 day', 'Dell Technologies', 'Equipment',
    a_equipment, 798.00, 'Monitor and docking station', 'approved', v_user_id, c_dell, v_user_id);
END IF;

-- ────────────────────────────────────────────────
-- PURCHASE ORDERS (3)
-- ────────────────────────────────────────────────

-- PO-0001: Office Depot, $1200, received
IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE tenant_id = 1 AND po_number = 'PO-0001') THEN
  INSERT INTO purchase_orders (tenant_id, po_number, contact_id, vendor_name, order_date,
    expected_delivery_date, status, subtotal, total, created_by)
  VALUES (1, 'PO-0001', c_office_depot, 'Office Depot', CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '20 days', 'received', 1200.00, 1200.00, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO purchase_order_lines (purchase_order_id, tenant_id, description, quantity_ordered, quantity_received, unit_price, amount, sort_order) VALUES
    (v_inv_id, 1, 'Office Supplies Bundle', 12, 12, 75.00, 900.00, 1),
    (v_inv_id, 1, 'Printer Toner Cartridges', 6, 6, 50.00, 300.00, 2);
END IF;

-- PO-0002: Dell, $9495, sent
IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE tenant_id = 1 AND po_number = 'PO-0002') THEN
  INSERT INTO purchase_orders (tenant_id, po_number, contact_id, vendor_name, order_date,
    expected_delivery_date, status, subtotal, total, created_by)
  VALUES (1, 'PO-0002', c_dell, 'Dell Technologies', CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '10 days', 'sent', 9495.00, 9495.00, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO purchase_order_lines (purchase_order_id, tenant_id, description, quantity_ordered, quantity_received, unit_price, amount, sort_order) VALUES
    (v_inv_id, 1, 'Dell Latitude 5540 Laptop', 5, 0, 1899.00, 9495.00, 1);
END IF;

-- PO-0003: Staples, $445, draft
IF NOT EXISTS (SELECT 1 FROM purchase_orders WHERE tenant_id = 1 AND po_number = 'PO-0003') THEN
  INSERT INTO purchase_orders (tenant_id, po_number, contact_id, vendor_name, order_date,
    status, subtotal, total, created_by)
  VALUES (1, 'PO-0003', c_staples, 'Staples', CURRENT_DATE,
    'draft', 445.00, 445.00, v_user_id)
  RETURNING id INTO v_inv_id;
  INSERT INTO purchase_order_lines (purchase_order_id, tenant_id, description, quantity_ordered, quantity_received, unit_price, amount, sort_order) VALUES
    (v_inv_id, 1, 'Desk Organizer Set', 5, 0, 29.00, 145.00, 1),
    (v_inv_id, 1, 'Filing Cabinet 3-Drawer', 2, 0, 150.00, 300.00, 2);
END IF;

-- ────────────────────────────────────────────────
-- BANK ACCOUNTS (2) and TRANSACTIONS (10)
-- ────────────────────────────────────────────────
INSERT INTO bank_accounts (tenant_id, name, account_id, institution, account_number_last4, currency, current_balance) VALUES
  (1, 'Chase Business Checking', a_checking, 'JPMorgan Chase', '4521', 'USD', 45320.00),
  (1, 'Wells Fargo Savings', a_savings, 'Wells Fargo', '8834', 'USD', 25000.00)
ON CONFLICT DO NOTHING;

SELECT id INTO ba_chase FROM bank_accounts WHERE tenant_id = 1 AND name = 'Chase Business Checking' LIMIT 1;
SELECT id INTO ba_wells FROM bank_accounts WHERE tenant_id = 1 AND name = 'Wells Fargo Savings' LIMIT 1;

-- Bank transactions on Chase (10: 6 deposits + 4 withdrawals)
IF NOT EXISTS (SELECT 1 FROM bank_transactions WHERE tenant_id = 1 AND bank_account_id = ba_chase LIMIT 1) THEN
  INSERT INTO bank_transactions (tenant_id, bank_account_id, date, description, amount, type, reference, reconciled, reconciled_date) VALUES
    (1, ba_chase, CURRENT_DATE - INTERVAL '28 days', 'Client payment - Acme Corp INV-0001', 2499.50, 'deposit', 'DEP-001', true, CURRENT_DATE - INTERVAL '25 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '25 days', 'Client payment - TechVision INV-0002', 899.70, 'deposit', 'DEP-002', true, CURRENT_DATE - INTERVAL '22 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '22 days', 'Wire transfer from savings', 5000.00, 'deposit', 'TRF-001', true, CURRENT_DATE - INTERVAL '20 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '20 days', 'Office Depot - supplies', -342.50, 'withdrawal', 'CHK-1001', true, CURRENT_DATE - INTERVAL '18 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '15 days', 'AWS - cloud services', -1247.83, 'withdrawal', 'ACH-001', true, CURRENT_DATE - INTERVAL '12 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '12 days', 'Consulting revenue deposit', 3500.00, 'deposit', 'DEP-003', true, CURRENT_DATE - INTERVAL '10 days'),
    (1, ba_chase, CURRENT_DATE - INTERVAL '10 days', 'Adobe - annual subscription', -659.88, 'withdrawal', 'ACH-002', false, NULL),
    (1, ba_chase, CURRENT_DATE - INTERVAL '7 days', 'Product sales batch deposit', 4200.00, 'deposit', 'DEP-004', false, NULL),
    (1, ba_chase, CURRENT_DATE - INTERVAL '5 days', 'Payroll run March 1-15', -8750.00, 'withdrawal', 'PAY-001', false, NULL),
    (1, ba_chase, CURRENT_DATE - INTERVAL '2 days', 'Customer payment - Green Energy', 1500.00, 'deposit', 'DEP-005', false, NULL);
END IF;

-- ────────────────────────────────────────────────
-- EMPLOYEES (4)
-- ────────────────────────────────────────────────
INSERT INTO employees (tenant_id, employee_number, first_name, last_name, email, phone,
  hire_date, status, pay_type, pay_rate, pay_frequency, department, position) VALUES
  (1,'EMP-0001','John','Smith','john.smith@democompany.com','(555) 401-0001',
    '2024-06-15','active','salary',75000.00,'biweekly','Engineering','Senior Developer'),
  (1,'EMP-0002','Maria','Garcia','maria.garcia@democompany.com','(555) 401-0002',
    '2024-09-01','active','salary',65000.00,'biweekly','Sales','Account Manager'),
  (1,'EMP-0003','David','Chen','david.chen@democompany.com','(555) 401-0003',
    '2025-01-10','active','hourly',35.00,'biweekly','Workshop','Technician'),
  (1,'EMP-0004','Sarah','Johnson','sarah.johnson@democompany.com','(555) 401-0004',
    '2025-03-01','active','salary',55000.00,'semimonthly','Admin','Office Manager')
ON CONFLICT (tenant_id, employee_number) DO NOTHING;

SELECT id INTO emp_smith FROM employees WHERE tenant_id = 1 AND employee_number = 'EMP-0001';
SELECT id INTO emp_garcia FROM employees WHERE tenant_id = 1 AND employee_number = 'EMP-0002';
SELECT id INTO emp_chen FROM employees WHERE tenant_id = 1 AND employee_number = 'EMP-0003';
SELECT id INTO emp_johnson FROM employees WHERE tenant_id = 1 AND employee_number = 'EMP-0004';

-- ────────────────────────────────────────────────
-- PAYROLL RUN (1) with items and journal entry
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM payroll_runs WHERE tenant_id = 1 AND run_number = 'PAY-0001') THEN
  -- Journal entry for payroll
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'PAY-0001', 'Payroll March 1-15, 2026', 'posted', '2026-03-15')
  RETURNING id INTO v_je_id;
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_salaries, 8750.00, 0, 'Gross payroll March 1-15'),
    (1, v_je_id, a_cash, 0, 8750.00, 'Net payroll disbursement');

  INSERT INTO payroll_runs (tenant_id, run_number, pay_period_start, pay_period_end, pay_date,
    status, total_gross, total_deductions, total_net, total_employer_taxes, journal_entry_id, created_by, approved_by)
  VALUES (1, 'PAY-0001', '2026-03-01', '2026-03-15', '2026-03-15',
    'posted', 8750.00, 1862.50, 6887.50, 669.38, v_je_id, v_user_id, v_user_id)
  RETURNING id INTO v_payroll_id;

  -- Payroll items for each employee
  -- John Smith: salary $75000/26 = $2884.62 gross
  INSERT INTO payroll_items (payroll_run_id, tenant_id, employee_id, hours_worked,
    gross_pay, federal_income_tax, social_security_employee, medicare_employee,
    state_income_tax, total_deductions, net_pay,
    social_security_employer, medicare_employer, futa_employer, suta_employer, total_employer_taxes)
  VALUES (v_payroll_id, 1, emp_smith, 80, 2884.62, 432.69, 178.85, 41.83, 115.38, 768.75, 2115.87,
    178.85, 41.83, 17.31, 23.08, 261.07);

  -- Maria Garcia: salary $65000/26 = $2500.00 gross
  INSERT INTO payroll_items (payroll_run_id, tenant_id, employee_id, hours_worked,
    gross_pay, federal_income_tax, social_security_employee, medicare_employee,
    state_income_tax, total_deductions, net_pay,
    social_security_employer, medicare_employer, futa_employer, suta_employer, total_employer_taxes)
  VALUES (v_payroll_id, 1, emp_garcia, 80, 2500.00, 375.00, 155.00, 36.25, 100.00, 666.25, 1833.75,
    155.00, 36.25, 15.00, 20.00, 226.25);

  -- David Chen: hourly $35 x 80hrs = $2800.00 gross
  INSERT INTO payroll_items (payroll_run_id, tenant_id, employee_id, hours_worked,
    gross_pay, federal_income_tax, social_security_employee, medicare_employee,
    state_income_tax, total_deductions, net_pay,
    social_security_employer, medicare_employer, futa_employer, suta_employer, total_employer_taxes)
  VALUES (v_payroll_id, 1, emp_chen, 80, 2800.00, 280.00, 173.60, 40.60, 56.00, 550.20, 2249.80,
    173.60, 40.60, 16.80, 22.40, 253.40);

  -- Sarah Johnson: salary $55000/24 = $2291.67 gross (semimonthly, but included in this run)
  INSERT INTO payroll_items (payroll_run_id, tenant_id, employee_id, hours_worked,
    gross_pay, federal_income_tax, social_security_employee, medicare_employee,
    state_income_tax, total_deductions, net_pay,
    social_security_employer, medicare_employer, futa_employer, suta_employer, total_employer_taxes)
  VALUES (v_payroll_id, 1, emp_johnson, 80, 565.38, 56.54, 35.05, 8.20, 22.61, 122.40, 442.98,
    35.05, 8.20, 3.39, 4.52, 51.16);
END IF;

-- ────────────────────────────────────────────────
-- FIXED ASSETS (3) with depreciation entries
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM fixed_assets WHERE tenant_id = 1 AND asset_number = 'FA-0001') THEN
  INSERT INTO fixed_assets (tenant_id, asset_number, name, description, category, purchase_date,
    purchase_price, salvage_value, useful_life_months, depreciation_method,
    asset_account_id, depreciation_expense_account_id, accumulated_depreciation_account_id,
    status, location, created_by) VALUES
    (1, 'FA-0001', 'Delivery Van', '2024 Ford Transit cargo van', 'Vehicles', '2024-06-01',
      35000.00, 5000.00, 60, 'straight_line',
      a_vehicles, a_depr_expense, a_accum_depr, 'active', 'Main Warehouse', v_user_id),
    (1, 'FA-0002', 'CNC Machine', 'Haas VF-2 Vertical Machining Center', 'Equipment', '2024-09-01',
      28000.00, 3000.00, 84, 'declining_balance',
      a_equipment, a_depr_expense, a_accum_depr, 'active', 'Workshop', v_user_id),
    (1, 'FA-0003', 'Office Furniture Set', 'Desks, chairs, and filing cabinets for main office', 'Furniture', '2025-01-01',
      4500.00, 500.00, 36, 'straight_line',
      a_equipment, a_depr_expense, a_accum_depr, 'active', 'Main Office', v_user_id);

  -- Depreciation journal entry (monthly batch for Feb 2026)
  INSERT INTO journal_entries (tenant_id, fiscal_period_id, reference, memo, status, posted_at)
  VALUES (1, v_fp_id, 'DEPR-2026-02', 'Monthly depreciation - February 2026', 'posted', '2026-02-28')
  RETURNING id INTO v_je_id;
  -- Delivery Van: (35000-5000)/60 = $500/month
  -- CNC: declining balance ~28000*2/84 = $666.67/month (simplified)
  -- Furniture: (4500-500)/36 = $111.11/month
  INSERT INTO journal_lines (tenant_id, journal_entry_id, account_id, debit, credit, description) VALUES
    (1, v_je_id, a_depr_expense, 1277.78, 0, 'Depreciation expense Feb 2026'),
    (1, v_je_id, a_accum_depr, 0, 1277.78, 'Accumulated depreciation Feb 2026');

  -- Depreciation entries for each asset
  INSERT INTO depreciation_entries (tenant_id, fixed_asset_id, period_date, depreciation_amount, accumulated_total, book_value, journal_entry_id)
  SELECT 1, fa.id, '2026-02-28', 500.00, 10000.00, 25000.00, v_je_id
  FROM fixed_assets fa WHERE fa.tenant_id = 1 AND fa.asset_number = 'FA-0001';

  INSERT INTO depreciation_entries (tenant_id, fixed_asset_id, period_date, depreciation_amount, accumulated_total, book_value, journal_entry_id)
  SELECT 1, fa.id, '2026-02-28', 666.67, 11333.39, 16666.61, v_je_id
  FROM fixed_assets fa WHERE fa.tenant_id = 1 AND fa.asset_number = 'FA-0002';

  INSERT INTO depreciation_entries (tenant_id, fixed_asset_id, period_date, depreciation_amount, accumulated_total, book_value, journal_entry_id)
  SELECT 1, fa.id, '2026-02-28', 111.11, 1555.54, 2944.46, v_je_id
  FROM fixed_assets fa WHERE fa.tenant_id = 1 AND fa.asset_number = 'FA-0003';
END IF;

-- ────────────────────────────────────────────────
-- MAINTENANCE RECORDS (2)
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM maintenance_records WHERE tenant_id = 1 LIMIT 1) THEN
  -- Delivery Van oil change, scheduled in 2 weeks
  INSERT INTO maintenance_records (tenant_id, fixed_asset_id, maintenance_type, title, description,
    scheduled_date, status, cost, created_by)
  SELECT 1, fa.id, 'preventive', 'Oil Change and Inspection', 'Regular 5000-mile oil change and vehicle inspection',
    CURRENT_DATE + INTERVAL '14 days', 'scheduled', 0, v_user_id
  FROM fixed_assets fa WHERE fa.tenant_id = 1 AND fa.asset_number = 'FA-0001';

  -- CNC Machine calibration, completed last month
  INSERT INTO maintenance_records (tenant_id, fixed_asset_id, maintenance_type, title, description,
    scheduled_date, completed_date, status, cost, created_by)
  SELECT 1, fa.id, 'preventive', 'Annual Calibration', 'Full calibration and alignment check by certified technician',
    CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '30 days', 'completed', 750.00, v_user_id
  FROM fixed_assets fa WHERE fa.tenant_id = 1 AND fa.asset_number = 'FA-0002';
END IF;

-- ────────────────────────────────────────────────
-- BILL OF MATERIALS (1) for Assembled Unit X
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM bill_of_materials WHERE tenant_id = 1 AND product_id = p_assembled LIMIT 1) THEN
  INSERT INTO bill_of_materials (tenant_id, product_id, name, version, status, yield_quantity, created_by)
  VALUES (1, p_assembled, 'Assembled Unit X BOM', '1.0', 'active', 1, v_user_id)
  RETURNING id INTO v_bom_id;

  -- BOM lines: 2x Raw Steel + 1x Copper Wire
  INSERT INTO bom_lines (bom_id, tenant_id, component_product_id, quantity_required, unit_of_measure, cost_per_unit, sort_order) VALUES
    (v_bom_id, 1, p_raw_steel, 2, 'sheet', 45.00, 1),
    (v_bom_id, 1, p_copper_wire, 1, 'roll', 32.00, 2);

  -- BOM labor: 2hrs @ $35/hr
  INSERT INTO bom_labor (bom_id, tenant_id, description, hours_required, hourly_rate, total_cost, sort_order)
  VALUES (v_bom_id, 1, 'Assembly Labor', 2.00, 35.00, 70.00, 1);

  -- BOM overhead: $15 fixed
  INSERT INTO bom_overhead (bom_id, tenant_id, description, cost_type, amount, sort_order)
  VALUES (v_bom_id, 1, 'Manufacturing Overhead', 'per_unit', 15.00, 1);
END IF;

-- ────────────────────────────────────────────────
-- WORK ORDER (1) — WO-0001 completed, 10x Assembled Unit X
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM work_orders WHERE tenant_id = 1 AND wo_number = 'WO-0001') THEN
  SELECT id INTO v_bom_id FROM bill_of_materials WHERE tenant_id = 1 AND product_id = p_assembled LIMIT 1;

  INSERT INTO work_orders (tenant_id, wo_number, bom_id, product_id, quantity_to_produce, quantity_produced,
    status, priority, scheduled_start, scheduled_end, actual_start, actual_end,
    location_id, estimated_cost, actual_cost, variance, assigned_to, created_by)
  VALUES (1, 'WO-0001', v_bom_id, p_assembled, 10, 10,
    'completed', 'normal',
    CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '8 days',
    loc_workshop, 2070.00, 2070.00, 0.00, 'David Chen', v_user_id)
  RETURNING id INTO v_wo_id;

  -- Material usage: 20x Raw Steel, 10x Copper Wire
  INSERT INTO work_order_material_usage (work_order_id, tenant_id, product_id, quantity_used, unit_cost, total_cost, date)
  VALUES
    (v_wo_id, 1, p_raw_steel, 20, 45.00, 900.00, CURRENT_DATE - INTERVAL '12 days'),
    (v_wo_id, 1, p_copper_wire, 10, 32.00, 320.00, CURRENT_DATE - INTERVAL '12 days');

  -- Labor: 20hrs total
  INSERT INTO work_order_labor (work_order_id, tenant_id, description, hours_worked, hourly_rate, total_cost, date)
  VALUES (v_wo_id, 1, 'Assembly work - 10 units', 20, 35.00, 700.00, CURRENT_DATE - INTERVAL '10 days');
END IF;

-- ────────────────────────────────────────────────
-- CRM PIPELINE, STAGES, OPPORTUNITIES (4)
-- ────────────────────────────────────────────────
-- Pipeline and stages are seeded by the CRM migration for tenant 1.
-- Just ensure we have the pipeline ID.
SELECT id INTO v_pipeline_id FROM crm_pipelines WHERE tenant_id = 1 AND name = 'Sales Pipeline' LIMIT 1;

IF v_pipeline_id IS NULL THEN
  -- Create pipeline if migration did not seed it
  INSERT INTO crm_pipelines (tenant_id, name, is_default) VALUES (1, 'Sales Pipeline', true)
  RETURNING id INTO v_pipeline_id;
  INSERT INTO crm_stages (pipeline_id, tenant_id, name, sort_order, probability, color, is_won, is_lost) VALUES
    (v_pipeline_id, 1, 'Lead', 1, 10.00, '#B4D4E7', false, false),
    (v_pipeline_id, 1, 'Qualified', 2, 25.00, '#D4A854', false, false),
    (v_pipeline_id, 1, 'Proposal', 3, 50.00, '#D4A854', false, false),
    (v_pipeline_id, 1, 'Negotiation', 4, 75.00, '#40916C', false, false),
    (v_pipeline_id, 1, 'Closed Won', 5, 100.00, '#2D6A4F', true, false),
    (v_pipeline_id, 1, 'Closed Lost', 6, 0.00, '#E07A5F', false, true);
END IF;

IF NOT EXISTS (SELECT 1 FROM crm_opportunities WHERE tenant_id = 1 LIMIT 1) THEN
  -- Acme Enterprise Deal $50000, Negotiation stage
  SELECT id INTO v_stage_id FROM crm_stages WHERE tenant_id = 1 AND pipeline_id = v_pipeline_id AND name = 'Negotiation' LIMIT 1;
  INSERT INTO crm_opportunities (tenant_id, contact_id, pipeline_id, stage_id, title, value, probability,
    weighted_value, expected_close_date, source, assigned_to, status, created_by)
  VALUES (1, c_acme, v_pipeline_id, v_stage_id, 'Acme Enterprise Deal', 50000.00, 75.00,
    37500.00, CURRENT_DATE + INTERVAL '30 days', 'Referral', 'Maria Garcia', 'open', v_user_id);

  -- TechVision Annual $24000, Proposal stage
  SELECT id INTO v_stage_id FROM crm_stages WHERE tenant_id = 1 AND pipeline_id = v_pipeline_id AND name = 'Proposal' LIMIT 1;
  INSERT INTO crm_opportunities (tenant_id, contact_id, pipeline_id, stage_id, title, value, probability,
    weighted_value, expected_close_date, source, assigned_to, status, created_by)
  VALUES (1, c_techvision, v_pipeline_id, v_stage_id, 'TechVision Annual Contract', 24000.00, 50.00,
    12000.00, CURRENT_DATE + INTERVAL '45 days', 'Website', 'Maria Garcia', 'open', v_user_id);

  -- BigMart $15000, Lead stage (no contact — new prospect)
  SELECT id INTO v_stage_id FROM crm_stages WHERE tenant_id = 1 AND pipeline_id = v_pipeline_id AND name = 'Lead' LIMIT 1;
  INSERT INTO crm_opportunities (tenant_id, pipeline_id, stage_id, title, value, probability,
    weighted_value, expected_close_date, source, assigned_to, status, created_by)
  VALUES (1, v_pipeline_id, v_stage_id, 'BigMart Retail Supply', 15000.00, 10.00,
    1500.00, CURRENT_DATE + INTERVAL '90 days', 'Trade Show', 'Maria Garcia', 'open', v_user_id);

  -- MedPro Expansion $35000, Qualified stage
  SELECT id INTO v_stage_id FROM crm_stages WHERE tenant_id = 1 AND pipeline_id = v_pipeline_id AND name = 'Qualified' LIMIT 1;
  INSERT INTO crm_opportunities (tenant_id, contact_id, pipeline_id, stage_id, title, value, probability,
    weighted_value, expected_close_date, source, assigned_to, status, created_by)
  VALUES (1, c_medpro, v_pipeline_id, v_stage_id, 'MedPro Expansion', 35000.00, 25.00,
    8750.00, CURRENT_DATE + INTERVAL '60 days', 'Existing Customer', 'Maria Garcia', 'open', v_user_id);
END IF;

-- ────────────────────────────────────────────────
-- BUDGETS (1) — 2026 Annual Budget with monthly lines
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM budgets WHERE tenant_id = 1 AND name = '2026 Annual Budget') THEN
  INSERT INTO budgets (tenant_id, name, fiscal_year, period_type, status, notes, created_by)
  VALUES (1, '2026 Annual Budget', 2026, 'monthly', 'active', 'Company-wide operating budget for fiscal year 2026', v_user_id)
  RETURNING id INTO v_budget_id;

  -- Monthly budget lines for key accounts (12 months)
  -- Revenue: $15000/month
  INSERT INTO budget_lines (budget_id, tenant_id, account_id, period_start, period_end, budgeted_amount)
  SELECT v_budget_id, 1, a_revenue,
    DATE_TRUNC('month', make_date(2026, m, 1)),
    (DATE_TRUNC('month', make_date(2026, m, 1)) + INTERVAL '1 month - 1 day')::date,
    15000.00
  FROM generate_series(1, 12) AS m;

  -- COGS: $6000/month
  INSERT INTO budget_lines (budget_id, tenant_id, account_id, period_start, period_end, budgeted_amount)
  SELECT v_budget_id, 1, a_cogs,
    DATE_TRUNC('month', make_date(2026, m, 1)),
    (DATE_TRUNC('month', make_date(2026, m, 1)) + INTERVAL '1 month - 1 day')::date,
    6000.00
  FROM generate_series(1, 12) AS m;

  -- Salaries: $9000/month
  INSERT INTO budget_lines (budget_id, tenant_id, account_id, period_start, period_end, budgeted_amount)
  SELECT v_budget_id, 1, a_salaries,
    DATE_TRUNC('month', make_date(2026, m, 1)),
    (DATE_TRUNC('month', make_date(2026, m, 1)) + INTERVAL '1 month - 1 day')::date,
    9000.00
  FROM generate_series(1, 12) AS m;

  -- Software: $2000/month
  INSERT INTO budget_lines (budget_id, tenant_id, account_id, period_start, period_end, budgeted_amount)
  SELECT v_budget_id, 1, a_software,
    DATE_TRUNC('month', make_date(2026, m, 1)),
    (DATE_TRUNC('month', make_date(2026, m, 1)) + INTERVAL '1 month - 1 day')::date,
    2000.00
  FROM generate_series(1, 12) AS m;

  -- Office Supplies: $500/month
  INSERT INTO budget_lines (budget_id, tenant_id, account_id, period_start, period_end, budgeted_amount)
  SELECT v_budget_id, 1, a_office_supplies,
    DATE_TRUNC('month', make_date(2026, m, 1)),
    (DATE_TRUNC('month', make_date(2026, m, 1)) + INTERVAL '1 month - 1 day')::date,
    500.00
  FROM generate_series(1, 12) AS m;
END IF;

-- ────────────────────────────────────────────────
-- NOTIFICATIONS (5)
-- ────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM notifications WHERE tenant_id = 1 LIMIT 1) THEN
  INSERT INTO notifications (tenant_id, user_id, type, category, title, message, link, is_read) VALUES
    (1, v_user_id, 'warning', 'invoicing', 'Invoice Overdue',
      'Invoice INV-0005 to Acme Corp ($1,199.60) is 15 days past due.',
      '/invoices', false),
    (1, v_user_id, 'warning', 'inventory', 'Low Stock Alert',
      'Widget Pro (WGT-001) stock at Store Front is at 20 units, approaching reorder point of 10.',
      '/inventory/products', false),
    (1, v_user_id, 'success', 'payroll', 'Payroll Posted',
      'Payroll run PAY-0001 for March 1-15 has been posted. Total net: $6,887.50.',
      '/payroll', true),
    (1, v_user_id, 'info', 'maintenance', 'Maintenance Scheduled',
      'Oil change for Delivery Van (FA-0001) is scheduled in 2 weeks.',
      '/fixed-assets', false),
    (1, v_user_id, 'info', 'system', 'Welcome to MA Finance Hub',
      'Your Demo Company account is set up and ready. Explore invoicing, expenses, inventory, and more.',
      '/dashboard', true);
END IF;

RAISE NOTICE 'Full demo data seeded successfully.';
END $$;

COMMIT;
EOSQL

echo ""
echo "=== Full demo seed complete ==="
echo ""
echo "Demo data includes:"
echo "  - 10 contacts (5 customers, 5 vendors)"
echo "  - 8 products (inventory, service, non-inventory)"
echo "  - 3 inventory locations with initial stock"
echo "  - 6 invoices (2 paid, 3 sent, 1 draft)"
echo "  - 8 expenses (4 posted, 2 approved, 2 pending)"
echo "  - 3 purchase orders (received, sent, draft)"
echo "  - 2 bank accounts with 10 transactions"
echo "  - 4 employees with 1 payroll run"
echo "  - 3 fixed assets with depreciation"
echo "  - 2 maintenance records"
echo "  - 1 BOM with 1 completed work order"
echo "  - 4 CRM opportunities in pipeline"
echo "  - 1 annual budget with monthly lines"
echo "  - 5 notifications"
echo "  - Journal entries for all posted transactions"
echo ""
echo "Login: admin@demo.com / Demo1234!"
