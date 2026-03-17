# Create Worktree

Set up an isolated worktree for feature work. This is REQUIRED before making any changes.

## Steps

1. Verify we're on `master`:
   ```bash
   git branch --show-current
   ```
   If not on master, we're already in a worktree — skip to step 5.

2. Ask the user for a short feature name if not provided (e.g., `shop-fixes`, `new-animation`).

3. Create the worktree:
   ```bash
   git worktree add -b feature/$FEATURE_NAME ../toolweb-$FEATURE_NAME
   ```

4. Install dependencies:
   ```bash
   cd ../toolweb-$FEATURE_NAME && pnpm install
   ```

5. Confirm the worktree is ready and the branch name.

## When Done

After all changes are committed and pushed:
```bash
git push -u origin feature/$FEATURE_NAME
cd ../toolweb
git worktree remove ../toolweb-$FEATURE_NAME
```
