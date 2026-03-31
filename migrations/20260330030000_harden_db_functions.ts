import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Pin search_path on SECURITY DEFINER function to prevent search_path hijacking
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_tenant_member(p_user_id bigint, p_tenant_id bigint)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.tenant_memberships
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public
  `);

  // Pin search_path on all session-reading functions
  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_tenant_id()
    RETURNS bigint AS $$
      SELECT nullif(current_setting('app.current_tenant_id', true), '')::bigint;
    $$ LANGUAGE sql STABLE
    SET search_path = public
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_subject()
    RETURNS text AS $$
      SELECT nullif(current_setting('app.current_subject', true), '');
    $$ LANGUAGE sql STABLE
    SET search_path = public
  `);

  // Harden append-only trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % operations are not allowed', TG_OP;
    END;
    $$ LANGUAGE plpgsql
    SET search_path = public
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
    SET search_path = public
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Restore without SET search_path (original versions)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION is_tenant_member(p_user_id bigint, p_tenant_id bigint)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM tenant_memberships
        WHERE user_id = p_user_id AND tenant_id = p_tenant_id
      );
    $$ LANGUAGE sql STABLE SECURITY DEFINER
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_tenant_id()
    RETURNS bigint AS $$
      SELECT nullif(current_setting('app.current_tenant_id', true), '')::bigint;
    $$ LANGUAGE sql STABLE
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION app_current_subject()
    RETURNS text AS $$
      SELECT nullif(current_setting('app.current_subject', true), '');
    $$ LANGUAGE sql STABLE
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_log is append-only: % operations are not allowed', TG_OP;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
}
