# Zoho CRM setup

Use a fictional developer organization for the assessment. This guide configures the exact field map shipped with the project. Organization editions, custom-field availability, required layouts and picklist values can differ; `zoho:check` reports actual metadata. If the free organization does not expose required modules/customization/API access, use an eligible developer environment or trial and confirm this with the evaluator.

## 1. Create credentials in the correct region

Sign up for Zoho CRM and open the API Console linked to the same data center. Create a **Self Client**. Generate an authorization code with these assessment scopes:

```text
ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.notifications.ALL
```

The BRD includes modules/settings scopes. The extra notifications scope is needed for the bidirectional callback subscription. For a production client, narrow scopes to the actual modules and operations.

Exchange the short-lived code for tokens through your region's accounts service, using a private terminal or Postman request:

```text
POST https://accounts.zoho.in/oauth/v2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
client_id=<your-client-id>
client_secret=<your-client-secret>
code=<your-short-lived-code>
```

Use your client registration's redirect URI if required for that client type. Store `refresh_token`, `client_id`, and `client_secret` only in the backend `.env`. Avoid putting credentials into query strings or sharing the response in a screenshot.

```dotenv
CRM_MODE=zoho
LLM_MODE=groq
GROQ_API_KEY=your_groq_key
ZOHO_ACCOUNTS_URL=https://accounts.zoho.in
ZOHO_API_DOMAIN=https://www.zohoapis.in
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
```

The `.in` values are India examples, not universal endpoints. Use `.com` for US or the appropriate domains for your region. Match production, developer or sandbox environment endpoints and credentials. The adapter uses the configured API domain so a callback cannot redirect an authenticated request.

Official references: [OAuth](https://www.zoho.com/crm/developer/docs/api/v8/oauth-overview.html), [authorization request](https://www.zoho.com/crm/developer/docs/api/v8/auth-request.html), [refresh tokens](https://www.zoho.com/crm/developer/docs/api/v8/refresh.html).

## 2. Configure fields and picklists

Use **field API names**, not just labels. Confirm them in Setup → Developer Hub / APIs → API Names, or inspect field metadata. Menu labels may differ by account.

Existing standard mappings:

| Module | Application values | Standard field API names |
| --- | --- | --- |
| Leads | fullName, phone, email, city, status | `Last_Name`, `Phone`, `Email`, `City`, `Lead_Status` |
| Contacts | fullName, phone, email | `Last_Name`, `Phone`, `Email` |
| Deals | name, stage, quote, contactId | `Deal_Name`, `Stage`, `Amount`, `Contact_Name` |
| Cases | subject, description, status, origin, contactId | `Subject`, `Description`, `Status`, `Case_Origin`, `Related_To` |

For simplicity, the complete entered name is written into `Last_Name`, a required standard field. Read responses prefer `Full_Name` when Zoho supplies it. In Cases, verify that `Related_To` is the Contact lookup in your organization; use the override mechanism if its API name differs.

Create these custom fields:

| Module | Field API name | Type and setup |
| --- | --- | --- |
| Leads | `Vehicle_Model` | Single line or picklist: Thar, XUV700, Scorpio-N |
| Leads | `Agent_Request_ID` | Single line, unique/no duplicates; stores UUID operation key |
| Deals | `Customer_Phone` | Phone or single line; canonical 10-digit Indian mobile |
| Deals | `Vehicle_Model` | Single line or same vehicle picklist |
| Deals | `Test_Drive_At` | Date/time |
| Deals | `Dealer_Contact` | Single line or multiline |
| Deals | `Follow_Up_Preference` | Single line, length at least 200 |
| Deals | `Booking_ID` | Single line, unique; e.g. MAH-9921 |
| Deals | `Allocation_Stage` | Picklist: Dispatch Pending, In Transit, Delivered |
| Deals | `Expected_Delivery_Date` | Date |
| Deals | `VIN` | Single line |
| Deals | `Balance_Payment_Link` | URL |
| Cases | `Vehicle_Registration` | Single line |
| Cases | `Odometer_Km` | Number, zero decimal places |
| Cases | `Service_Center_Location` | Single line |
| Cases | `Service_Type` | Single line; accepts customer service description |
| Cases | `Agent_Request_ID` | Single line, unique/no duplicates |

Configure these exact picklist options:

- Deals `Stage`: `Test Drive Scheduled` and `Closed Won - Booking Done`. Map the latter as a won stage. If you use a different booked option, set `ZOHO_BOOKED_STAGE` to that exact value.
- Leads `Lead_Status`: `Not Contacted`.
- Cases `Status`: `New`; `Case_Origin`: `Web`.
- If Deals require a Pipeline, put its actual value in `ZOHO_PIPELINE`.
- If your layout requires Account, Product, Type, or another field, provide those values in the relevant payload builder before seeding. `zoho:check` shows system-required metadata; inspect layout-specific rules separately.

You can override field API names without changing the adapter. Create `zoho-fields.json` at project root, for example:

```json
{
  "Leads": { "vehicle": "Interested_Vehicle" },
  "Deals": { "bookingId": "Customer_Booking_Code" },
  "Cases": { "location": "Preferred_Center" }
}
```

Then set `ZOHO_FIELD_MAP_FILE=zoho-fields.json`. The override merges into `apps/server/src/crm/fields.js`. It changes field names, not module names or field types.

Run:

```bash
npm run zoho:check
```

This command reads metadata. It does not create fields automatically. Fix missing names and check printed picklist values before proceeding.

References: [field metadata](https://www.zoho.com/crm/developer/docs/api/v8/field-meta.html), [insert records](https://www.zoho.com/crm/developer/docs/api/v8/insert-records.html), [search records](https://www.zoho.com/crm/developer/docs/api/v8/search-records.html).

## 3. Seed the required records

Run the following only in the assessment organization; it creates fictional records there:

```bash
npm run zoho:seed
```

| Fixture | Lookup | Purpose |
| --- | --- | --- |
| Rajesh Sharma | 9000000001 | Existing Lead interested in Thar |
| Priya Patel | 9000000002 | Contact and active XUV700 test-drive Deal |
| Arjun Mehta | 9000000003 | Contact and Scorpio-N booking Deal MAH-9921 |

The test-drive date is generated two days ahead; booking delivery estimate is fourteen days ahead. These are fictional dates. VIN/payment URL remain blank. The seed command looks up existing fixtures before creating them; reruns do not reset their fields or statuses. Use the dashboard if you intentionally want to reset a fixture.

## 4. Set up incoming CRM notifications

The callback must be reachable at your own **public HTTPS application URL**. A local `127.0.0.1` URL cannot receive Zoho callbacks. Use your chosen HTTPS environment or a tunnel and only fictional data for the assessment. The application is not deployed by this ZIP.

Generate a secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
```

Configure:

```dotenv
PUBLIC_BASE_URL=https://your-demo-host.example
ZOHO_WEBHOOK_TOKEN=the_48_character_random_value
ZOHO_CHANNEL_ID=10001
```

Restart the backend, then run:

```bash
npm run zoho:watch
```

This registers `Leads.all`, `Deals.all`, `Contacts.all`, and `Cases.all` with `/api/webhooks/zoho`. It uses a six-day expiry. **Re-run before the printed expiry** to renew; automatic renewal is not implemented. Zoho notification channels have a limited lifetime, so a successful setup does not remain active indefinitely.

The callback requires the matching token and channel. It treats the module and IDs as an invalidation signal and never follows callback `resource_uri` values. Connected sessions that know an affected record receive an event; the UI re-reads through the authenticated backend. Deletions display a record-unavailable error on refresh.

Fallback polling defaults to 30 seconds per open browser tab and only reads known records. Hidden tabs stop fallback polling; manual Refresh works too. Disable polling after verifying callbacks if API credits are a concern.

References: [notifications overview](https://www.zoho.com/crm/developer/docs/api/v8/notifications/overview.html), [enable notifications](https://www.zoho.com/crm/developer/docs/api/v8/notifications/enable.html).

## 5. Verify before recording

1. Start the app with the Groq/Zoho mode labels visible.
2. Create a new Lead via chat, confirm it, and find it in Zoho with its Vehicle Model.
3. Fetch Priya's Deal and update her follow-up preference; verify the field in Zoho.
4. Fetch MAH-9921. Change Allocation Stage in Zoho. Confirm the app panel changes without sending a new message, then ask for status again.
5. Create a service request for Arjun and inspect the Case's Contact lookup, registration, odometer and location in Zoho.
6. Check unknown identifiers and invalid email/odometer handling.
7. Do not expose API credentials or refresh tokens during recording.

No successful live requests are claimed in the supplied test report; your account-specific results belong here after you run these steps.
