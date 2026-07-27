# Cloudflare Account Migration — 2026-07-27

RSIMD-ITEMS was moved from the `ghwmelite@gmail.com` Cloudflare account
(`ea2eb3a9…`) to the `ohcsghana.main@gmail.com` account (`f4f236a6…`).
All project resources in the old account were purged the same day.

## Final state

| Resource | Old account (purged) | New account (live) |
| -------- | -------------------- | ------------------ |
| Pages `rsimd-items` | — (never existed here) | ✅ serving https://rsimd-items.pages.dev |
| Worker `rsimd-items-api` | 🗑 deleted | ✅ `rsimd-items-api.ohcsghana-main.workers.dev` |
| D1 `rsimd_items_db` | 🗑 deleted (`c0ef4000…`) | ✅ `ff57f1b7-da26-490c-aaf7-19228acf16a1` |
| KV | 🗑 deleted (`b873309f…`) | ✅ `rsimd-items-kv` (`f05fbbee…`) |
| R2 `rsimd-items-files` | 🗑 deleted (was empty) | ✅ exists (empty) |
| Workers AI binding | account-scoped | ✅ inherent per-account |

## What was done on 2026-07-27

The migration was found **partially complete** (Pages project, worker, D1/KV/R2
shells, and the frontend build already pointed at the new account). This
session finished it:

1. **Data delta merged** — the old D1 still held production rows missing from
   the new one: technician `tech-4b4c01e2` and all **8 maintenance schedule
   rows** (Q2 week 1). Merged via the D1 query API with `INSERT OR REPLACE`
   (row counts verified after: technicians 2, schedules 8; categories 14 and
   org entities 11 already matched).
2. **Old account purged** — deleted worker `rsimd-items-api`, D1 `c0ef4000…`,
   KV `b873309f…`, and the empty R2 bucket. Post-purge sweep across Workers,
   D1, KV, R2, and Pages shows **zero** rsimd resources remaining.
3. **Verified live** — new worker `/api/health` → ok; API correctly requires
   auth; https://rsimd-items.pages.dev → 200 and its bundle references only
   `rsimd-items-api.ohcsghana-main.workers.dev`.
4. **Repo config committed** — `api/wrangler.toml` (new D1/KV IDs) and
   `web/.env.production` (new API URL) were previously uncommitted local
   changes; they are now versioned so a fresh clone deploys to the right
   account.

## Redeploying

```bash
# API (targets the new account via CLOUDFLARE_ACCOUNT_ID)
cd api
CLOUDFLARE_ACCOUNT_ID=f4f236a6cd8fbddf397c6e9de17d8113 npx wrangler deploy

# Frontend
cd web
npm run build   # reads web/.env.production
CLOUDFLARE_ACCOUNT_ID=f4f236a6cd8fbddf397c6e9de17d8113 \
  npx wrangler pages deploy dist --project-name rsimd-items
```

## Notes

- Old-account D1 deletion is irreversible; its full contents are preserved in
  the new database (all 9 tables verified by row count before deletion).
- `wrangler` v4.114 on this machine ignores `CLOUDFLARE_ACCOUNT_ID` for
  `pages project list/create` (pins to the default account) but honours it
  for `deploy` and `pages deploy` — verify account-level state via the REST
  API when in doubt.
