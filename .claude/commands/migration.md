# Database Migration Workflow

Use when adding tables, columns, indexes, enums, or RLS policies.

## Steps

1. **Create the migration file**:
   ```bash
   npx supabase migration new <descriptive_name>
   ```
   This creates a timestamped SQL file in `supabase/migrations/`.

2. **Write the SQL**: Follow existing migration patterns. Check recent migrations for style.

3. **FK safety check**: If adding a foreign key between tables that already have a FK relationship:
   - This WILL break existing PostgREST queries with `PGRST201`
   - Grep for all `.select()` calls that embed the target table
   - Update them to use explicit FK names: `table!fk_name (*)`

4. **Push to remote**:
   ```bash
   npx supabase db push
   ```
   Single project shared across preview and production — safe to push anytime.

5. **Verify**:
   ```bash
   npx supabase migration list
   ```

6. **Update data model skill** if schema changed significantly:
   Edit `.claude/skills/data-model.md` to reflect new tables/enums.

## Requires

`SUPABASE_ACCESS_TOKEN` env var must be set before running Supabase CLI commands.
