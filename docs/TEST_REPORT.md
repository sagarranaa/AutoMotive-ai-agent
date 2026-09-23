# Verification report

Verification performed on 22 September 2026 with Node.js 24.19.0 and npm 11.9.0. All CRM fixtures are fictional. No Groq key or Zoho credentials were supplied, so provider behavior was tested through mocked HTTP contracts and a fake model responder, not authenticated live calls.

## Automated results

`npm test`: **24 passed, 0 failed**.

| Area | Tests | Coverage |
| --- | --- | --- |
| Workflow and agent | 11 | Confirmation before writes, duplicate lead detection, field validation, known-record restrictions, follow-up changes, booking freshness, Contact-linked Cases, topic switching, fake-model tool loop, payment host filtering, uncertain writes and session ownership |
| Zoho adapter contracts | 7 | Concurrent refresh, token caching, 401 refresh/retry, HTTP-200 row errors, criteria injection rejection, exact-match filtering, Cases Contact field mapping, ambiguous write timeout |
| HTTP routes | 4 | SSE booking response, scoped snapshots, bearer validation, malformed JSON, cancellation, webhook authentication and live-mode demo-route rejection |
| Groq stream parsing | 2 | Fragmented tool arguments, streamed text chunks, incomplete response rejection |

`npm run build`: **passed**, producing the React production bundle.

`npm audit --omit=dev --audit-level=high`: reported **0 production dependency vulnerabilities** at verification time. This is a point-in-time dependency check, not a complete security audit.

## Browser verification

The production build was exercised in a headless Chromium browser using Playwright. The normal browser download was unavailable; a locally extracted Chromium package was used for the same checks.

- Lead data entered through chat; confirmation created a Lead.
- Active Deal retrieved; confirmed follow-up changed to WhatsApp after 6 PM.
- MAH-9921 retrieved; allocation changed through the mock CRM update control; SSE refreshed the CRM panel to Delivered without another chat message.
- Service request created and linked to the existing Contact.
- Browser reload preserved the conversation and its saved confirmation messages.
- Desktop checked at 1440 × 1040.
- Mobile checked at 390 × 844; no document horizontal overflow.
- No browser page errors were observed.

Screenshots: [desktop](desktop-preview.png) and [mobile](mobile-preview.png). The screenshots show mock data and are not evidence of live Zoho connectivity.

## Not verified here

- Real Groq model availability, account permissions, quotas or natural-language routing accuracy.
- Actual Zoho organization authentication, field/layout requirements and write permissions.
- Public HTTPS delivery of notifications from Zoho and channel renewal in your hosting environment.
- End-to-end latency or concurrent-user load under production traffic.
- A hosted deployment, private GitHub repository, evaluator access or Loom recording.

Run the live acceptance steps in ZOHO_SETUP.md and update this report with your own account-specific results before submitting. Do not describe mock tests as proof that the live provider integration succeeded.
