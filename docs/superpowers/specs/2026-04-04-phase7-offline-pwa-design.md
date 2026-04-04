# Phase 7: Offline/PWA Enhancements — Design Specification

**Date:** 2026-04-04
**Status:** Approved

---

## 1. Full Offline Data Caching

### Strategy
On first successful API fetch of reference data (org entities, categories, equipment list), cache the response in IndexedDB. On subsequent requests, if offline, serve from cache.

### IndexedDB Stores (add to existing offline-store.ts)
- `cached_data` store with key = API path, value = `{data, cached_at}`
- Functions: `cacheApiResponse(path, data)`, `getCachedResponse<T>(path): {data: T, cached_at: string} | null`

### Integration
- Update `api-client.ts` to support offline fallback: if `navigator.onLine === false` and a GET request fails, check IndexedDB cache
- Cached paths: `/org-entities`, `/categories`, `/equipment`
- Show "Cached data from X ago" banner when serving stale data

---

## 2. Sync Progress Indicator

### Changes to OfflineContext
- Add `syncProgress: {current: number, total: number} | null` state
- During `syncPending()`, update progress as each log syncs (use individual POST instead of bulk, or track bulk progress)
- Simpler approach: since bulk-sync is a single request, show indeterminate progress during sync and count after

### Header Update
- When syncing: show "Syncing..." with spinner instead of pending count
- When done: brief "Synced!" message then hide

---

## 3. Install Prompt (Add to Home Screen)

### Implementation
- Listen for `beforeinstallprompt` event
- Show a custom banner at the top of the page (not the browser's default prompt)
- "Install RSIMD-ITEMS for quick access" with Install and Dismiss buttons
- Dismissal stored in localStorage (`rsimd_install_dismissed`)
- Only show on mobile (screen width < 1024)

---

## File Structure

| File | Change |
|------|--------|
| `web/src/lib/offline-store.ts` | Add cached_data store + cache/retrieve functions |
| `web/src/lib/api-client.ts` | Add offline fallback on GET failures |
| `web/src/context/OfflineContext.tsx` | Add sync progress state |
| `web/src/components/layout/Header.tsx` | Sync progress indicator |
| `web/src/components/layout/InstallBanner.tsx` | New — PWA install prompt |
| `web/src/components/layout/AppShell.tsx` | Mount InstallBanner |
| `web/public/sw.js` | Improve caching strategy |
