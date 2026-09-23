# Six minute demo walkthrough

Record the application and your fictional Zoho organization in adjacent browser tabs. Use `CRM_MODE=zoho` and `LLM_MODE=groq` for the submission recording. A mock-only recording is useful for rehearsal but does not demonstrate real Zoho integration.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:40 | README, architecture diagram, visible Groq/Zoho mode labels | React frontend, Node orchestration, validated tools, CRM adapter and persisted session |
| 0:40–1:45 | New lead conversation and review card | Vehicle answers use a labeled synthetic catalog. Collect all four contact fields and vehicle, confirm, then show the created Lead and Vehicle Model in Zoho |
| 1:45–2:40 | Priya's active Deal | Look up 9000000002; show test drive/quote/dealer. Request an evening follow-up, confirm, then show the updated CRM field |
| 2:40–3:45 | Booking MAH-9921 | Show allocation and estimate; explain null VIN/payment values. Change allocation directly in Zoho and show the live panel refresh; ask again for current status |
| 3:45–4:50 | Service request for 9000000003 | Collect registration, odometer, issue/type and location. Confirm; show Case and Contact relationship in Zoho |
| 4:50–5:25 | Context switch and edge cases | Return to vehicle discovery; refresh browser to show persisted history. Try invalid email or unknown booking; show useful recovery |
| 5:25–6:15 | Tests and implementation decisions | Show `npm test`, token refresh logic, confirmation ledger and safe error handling. Clearly mention demo scope and production identity-verification work |

## Suggested messages

1. “I am interested in the Thar. What features does it offer, and can I request a test drive?”
2. “My name is Sagar Rana, phone 9000000004, email sagar@example.com. I prefer Pune.”
3. “Now check my existing XUV700 deal using 9000000002.”
4. “Please change follow-up to WhatsApp after 6 PM.”
5. “What is the allocation status for MAH-9921? Has a VIN been assigned?”
6. After editing CRM: “Please check my delivery status again.”
7. “I also need service for the vehicle linked to 9000000003.”
8. “Registration MH12AB1234, 15000 km, routine maintenance, Pune service center.”

In offline demo mode, use the labeled messages in README. Live Groq may ask follow-up questions differently; respond naturally and confirm the actual review card. Use a new fictional phone/email for additional lead demos if the previous lead already exists.

## Recording preparation

- Run live field checks and seed data before recording.
- Renew notifications and test the callback before the session.
- Reset fictional allocation stage to In Transit in Zoho.
- Keep `.env`, tokens, browser developer storage and authorization headers off-screen.
- Keep the terminal test output and CRM dashboard ready.
- Record your own explanation; ensure you can explain every tool and design choice.
- Add the final Loom URL to your repository README after recording. No video URL is supplied or fabricated in this project.
