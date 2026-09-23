# API reference

Base path: `/api`. Except health, session creation and the separately authenticated Zoho callback, endpoints require `Authorization: Bearer <session-token>`. A token comes from `POST /api/sessions`; the frontend keeps it in browser sessionStorage. JSON request bodies are limited to 32 KB. A simple per-IP limiter allows 180 requests per minute; adjust infrastructure controls before production.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/health` | Reports modes, status and polling interval; exposes no keys |
| POST | `/sessions` | Creates a fresh random bearer session |
| GET | `/session` | History, current stage and pending review card |
| POST | `/chat` | Body `{ "message": "..." }`; SSE response |
| POST | `/actions/:id/confirm` | Executes the server-held action once or returns its stored successful result |
| POST | `/actions/:id/cancel` | Cancels the matching pending action |
| GET | `/crm/snapshot` | Fresh reads of up to 12 records known to this session |
| GET | `/events` | SSE invalidation events for known CRM records |
| POST | `/webhooks/zoho` | Verifies notification secret/channel; emits scoped invalidations |
| POST | `/demo/booking-stage` | Mock mode only; body `{ "stage": "Delivered" }` updates the fixture |

## Chat stream

```text
event: status
data: {"message":"Checking find booking…"}

event: delta
data: {"text":"Your vehicle is in transit."}

event: done
data: {"stage":"booking","pending":null}
```

Errors after HTTP headers are sent use `event: error` with `{error, code}`. HTTP success alone does not mean a completed chat. The frontend consumes the stream and then loads the persisted session to reconcile state. The mock parser emits its answer as a single delta. Groq emits genuine text chunks.

## Confirmation flow

A proposal produces a pending action with a random ID, kind, data, and timestamp. The client does not send replacement field values to the confirm endpoint; it only confirms the stored action ID. Cards expire after 30 minutes. Confirm or cancel an existing card before preparing another.

Repeated successful confirmations return the same stored result. Another session cannot confirm that ID. Network ambiguity marks a write uncertain and blocks replay until an operator reconciles it. A cancelled action does not write CRM.

## Synchronization

`GET /events` sends `connected`, `crm_changed`, and periodic comments as heartbeats. Clients use fetch streaming to supply bearer headers rather than putting tokens in URL query strings. `crm_changed` includes only module and ID, not CRM data; use `/crm/snapshot` for fresh authorized-adapter reads. Reconnection is automatic. Polling covers missed events when configured.

## Error examples

- 400: invalid phone/email/input or malformed JSON.
- 401: missing session, invalid webhook secret, or invalid webhook channel.
- 404: unsupported endpoint or missing record.
- 409: expired/nonmatching action or uncertain previous write outcome.
- 413: request body too large.
- 422: bounded agent loop exhausted.
- 429: local request rate limit.
- 502/503: CRM/model configuration, provider failure, timeout, or rejected write.

CRM errors with HTTP 200 but row-level failure are treated as errors. Detailed credentials and provider request bodies are not returned to the browser.
