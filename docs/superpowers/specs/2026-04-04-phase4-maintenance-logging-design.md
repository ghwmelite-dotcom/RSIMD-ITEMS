# Phase 4: Maintenance Logging Enhancements — Design Specification

**Date:** 2026-04-04
**Status:** Approved

---

## 1. Voice-to-Description

### Implementation
- Microphone icon button next to the description textarea in LogForm
- Uses `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- On click: starts continuous recognition, button turns red with pulsing animation
- Transcribed text appends to existing description (doesn't replace)
- On stop or silence: stops recognition
- If browser doesn't support: button hidden or shows tooltip "Voice not supported"
- Language: `en-GH` (English Ghana) with fallback to `en`

### Files
- Create: `web/src/components/maintenance/VoiceInput.tsx`
- Modify: `web/src/components/maintenance/LogForm.tsx` — add VoiceInput next to textarea

---

## 2. Photo Capture & Upload

### API
- New endpoint: `POST /api/upload` — accepts multipart form data with image file
- Uploads to R2 at `photos/{uuid}.{ext}`
- Returns `{ url: string }` (the R2 key)
- Max file size: 5MB
- Accepted types: image/jpeg, image/png, image/webp

### Frontend
- Camera/gallery button on LogForm
- Uses `<input type="file" accept="image/*" capture="environment">`
- Preview thumbnails with remove button
- Max 3 photos per log
- On form submit: upload each photo first, collect URLs, include in `photo_urls` array
- Existing `photo_urls` field on maintenance_logs already stores JSON array

### Files
- Create: `web/src/components/maintenance/PhotoCapture.tsx`
- Create: `api/src/routes/upload.ts`
- Modify: `api/src/router.ts` — add upload route
- Modify: `web/src/components/maintenance/LogForm.tsx` — add PhotoCapture, send photo_urls

---

## 3. Quick-Repeat (Same as Last Time)

### Implementation
- When `prefill.equipment_id` is set in LogForm (i.e., came from QR scan or equipment detail)
- Fetch last maintenance log for that equipment: `GET /api/maintenance?equipment_id=X&limit=1`
- Show "Repeat last" button if a previous log exists
- On click: fills description, resolution, category_id, maintenance_type from previous log
- User can still edit before submitting

### API
- Add equipment_id filter to existing maintenance list endpoint (already supports org_entity_id, etc.)
- Need to add `equipment_id` filter support in `listMaintenanceLogs` query helper

### Files
- Modify: `api/src/db/queries.ts` — add equipment_id filter to listMaintenanceLogs
- Modify: `web/src/components/maintenance/LogForm.tsx` — add repeat button logic

---

## 4. Enhanced Offline Form UX

### Implementation
- LogForm checks `useOfflineSync().isOnline`
- When offline:
  - Submit button text: "Save Offline" (yellow variant)
  - Banner at top of form: "You're offline — this log will sync when you reconnect"
  - On submit: calls `saveOfflineLog()` instead of `api.post()`
- When online: normal behavior (no change)
- Pending count badge shown next to the form title when pending > 0

### Files
- Modify: `web/src/components/maintenance/LogForm.tsx` — offline detection + offline save path

---

## File Structure Summary

### API
| File | Change |
|------|--------|
| `api/src/routes/upload.ts` | New — photo upload to R2 |
| `api/src/router.ts` | Add upload route |
| `api/src/db/queries.ts` | Add equipment_id filter |

### Frontend
| File | Change |
|------|--------|
| `web/src/components/maintenance/VoiceInput.tsx` | New — speech recognition button |
| `web/src/components/maintenance/PhotoCapture.tsx` | New — camera input + preview |
| `web/src/components/maintenance/LogForm.tsx` | Add voice, photo, repeat, offline UX |
