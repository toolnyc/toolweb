# New Feature Workflow

End-to-end workflow for implementing a new feature.

## Steps

1. **Create worktree** (if on master):
   ```bash
   git branch --show-current
   ```
   If `master`, create a worktree first:
   ```bash
   git worktree add -b feature/$NAME ../toolweb-$NAME
   cd ../toolweb-$NAME && pnpm install
   ```

2. **Understand the ask**: Read relevant existing code before writing anything. Check `src/lib/` for existing patterns that apply.

3. **Implement**: Make changes. Follow existing patterns:
   - Env vars through `src/lib/env.ts` getters only
   - Public queries through `src/lib/queries.ts` (anon client, return empty on error)
   - Mutations through `src/lib/mutations.ts` (admin client)
   - New pages follow existing layout patterns in `src/layouts/`

4. **Verify**:
   ```bash
   pnpm astro check    # Must pass: 0 errors
   pnpm build          # Must complete without errors
   ```

5. **Run structural tests** (if they exist):
   ```bash
   pnpm test
   ```

6. **Commit and push**:
   ```bash
   git add <specific files>
   git commit -m "description"
   git push -u origin feature/$NAME
   ```

## Do NOT

- Refactor adjacent code
- Add docstrings to code you didn't change
- Expand scope beyond what was asked
- Import `import.meta.env` outside `cookies.ts`
- Use `file.stream()` for R2 uploads
- Duplicate business logic (status checks, visibility filters)
