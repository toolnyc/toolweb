import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function readSrc(file: string): string {
  return readFileSync(file, 'utf-8');
}

describe('Architecture invariants', () => {
  describe('No banned Node.js imports (Cloudflare V8 constraint)', () => {
    const banned = [
      { module: 'sharp', pattern: /(?:from\s+['"]sharp['"]|require\s*\(\s*['"]sharp['"])/ },
      { module: 'fs', pattern: /(?:from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\s*\(\s*['"](?:node:)?fs(?:\/promises)?['"])/ },
      { module: 'child_process', pattern: /(?:from\s+['"](?:node:)?child_process['"]|require\s*\(\s*['"](?:node:)?child_process['"])/ },
    ];

    const srcFiles = [
      ...findFiles(join(SRC, 'lib'), '.ts'),
      ...findFiles(join(SRC, 'pages'), '.ts'),
      ...findFiles(join(SRC, 'pages'), '.astro'),
      ...findFiles(join(SRC, 'components'), '.astro'),
      ...findFiles(join(SRC, 'components'), '.ts'),
    ];

    for (const { module, pattern } of banned) {
      it(`no source files import "${module}"`, () => {
        const violations: string[] = [];
        for (const file of srcFiles) {
          const content = readSrc(file);
          if (pattern.test(content)) {
            violations.push(file.replace(ROOT + '/', ''));
          }
        }
        expect(violations, `Files importing banned module "${module}"`).toEqual([]);
      });
    }
  });

  describe('import.meta.env only used in cookies.ts', () => {
    it('no files other than cookies.ts use import.meta.env', () => {
      const srcFiles = [
        ...findFiles(join(SRC, 'lib'), '.ts'),
      ];

      const violations: string[] = [];
      for (const file of srcFiles) {
        if (file.endsWith('cookies.ts')) continue;
        const content = readSrc(file);
        if (/import\.meta\.env\.(?!BASE_URL)/.test(content)) {
          violations.push(file.replace(ROOT + '/', ''));
        }
      }
      expect(
        violations,
        'Only src/lib/cookies.ts should use import.meta.env for Vite built-ins. Other env vars must go through src/lib/env.ts getters.',
      ).toEqual([]);
    });
  });

  describe('R2 upload pattern', () => {
    it('no R2 put() calls use file.stream()', () => {
      const srcFiles = [
        ...findFiles(join(SRC, 'pages'), '.ts'),
        ...findFiles(join(SRC, 'lib'), '.ts'),
      ];

      const violations: string[] = [];
      for (const file of srcFiles) {
        const content = readSrc(file);
        // Detect .put(key, file.stream()) or .put(key, something.stream())
        if (/\.put\([^)]*\.stream\(\)/.test(content)) {
          violations.push(file.replace(ROOT + '/', ''));
        }
      }
      expect(
        violations,
        'Use file.arrayBuffer() not file.stream() for R2 put() — stream() is unreliable across runtimes.',
      ).toEqual([]);
    });
  });

  describe('wrangler.toml non-inheritable key consistency', () => {
    it('env blocks repeat all non-inheritable keys from top level', () => {
      const wranglerPath = join(ROOT, 'wrangler.toml');
      if (!existsSync(wranglerPath)) return;

      const content = readSrc(wranglerPath);

      // Check if any env block exists
      const envBlocks = content.match(/\[env\.\w+/g);
      if (!envBlocks) return;

      // Non-inheritable key patterns at top level
      const nonInheritable = [
        { key: 'r2_buckets', pattern: /^\[\[r2_buckets\]\]/m },
        { key: 'vars', pattern: /^\[vars\]/m },
        { key: 'kv_namespaces', pattern: /^\[\[kv_namespaces\]\]/m },
        { key: 'd1_databases', pattern: /^\[\[d1_databases\]\]/m },
      ];

      const topLevelKeys = nonInheritable
        .filter(({ pattern }) => pattern.test(content))
        .map(({ key }) => key);

      if (topLevelKeys.length === 0) return;

      // For each env block, check that ALL top-level non-inheritable keys appear
      const envNames = [...new Set(envBlocks.map((b) => b.replace('[env.', '')))];

      const violations: string[] = [];
      for (const envName of envNames) {
        // Check if this env block overrides ANY non-inheritable key
        const envOverridesAny = nonInheritable.some(({ key }) => {
          const envPattern = new RegExp(`\\[env\\.${envName}\\.?${key}|\\[\\[env\\.${envName}\\.${key}\\]\\]`, 'm');
          return envPattern.test(content);
        });

        if (!envOverridesAny) continue;

        // If it overrides any, ALL top-level keys must be present
        for (const key of topLevelKeys) {
          const envPattern = new RegExp(`env\\.${envName}[.\\]].*${key}|env\\.${envName}\\.${key}`, 'm');
          if (!envPattern.test(content)) {
            violations.push(`[env.${envName}] overrides non-inheritable keys but is missing "${key}" (present at top level)`);
          }
        }
      }

      expect(
        violations,
        'Cloudflare Pages non-inheritable keys: if ANY is overridden in an env block, ALL must be repeated.',
      ).toEqual([]);
    });
  });

  describe('Stripe metadata discipline', () => {
    it('checkout endpoints include checkout_type in metadata', () => {
      const checkoutFiles = findFiles(join(SRC, 'pages', 'api'), '.ts')
        .filter((f) => f.includes('checkout'));

      for (const file of checkoutFiles) {
        const content = readSrc(file);
        // If file creates a Stripe session, it should include checkout_type in metadata
        if (/checkout\.sessions\.create/.test(content)) {
          expect(
            content,
            `${file.replace(ROOT + '/', '')} creates a Stripe checkout session but is missing checkout_type in metadata`,
          ).toMatch(/checkout_type/);
        }
      }
    });
  });
});
