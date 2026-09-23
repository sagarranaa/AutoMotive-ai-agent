# Submission checklist

## Included in this project

- [x] React responsive chat frontend.
- [x] Modular Node.js backend and actual Groq tool-calling implementation.
- [x] Four lifecycle workflows and context switching.
- [x] Zoho OAuth/REST adapter and notification callback implementation.
- [x] Leads/Deals/Cases mapping and Contact-linked service requests.
- [x] Persistent local sessions and fictional fixture CRM.
- [x] Backend-only `.env.example`, setup scripts and lockfile.
- [x] Architecture/workflow diagrams and API documentation.
- [x] Automated tests and production build verification.
- [x] Demo recording script and handoff instructions.

## Complete with your accounts before submission

- [ ] Configure a Groq key and test natural-language tool routing with your enabled model.
- [ ] Create the Zoho developer organization, credentials, fields, layouts and picklists.
- [ ] Run live field check and seed commands successfully.
- [ ] Verify all four workflows in Zoho's dashboard.
- [ ] Configure and verify the public HTTPS webhook callback.
- [ ] Record a 5–7 minute Loom video showing both the app and real Zoho updates.
- [ ] Create a **private** GitHub repository and push the source.
- [ ] Add the evaluator using the exact identity they supplied.
- [ ] Include the Loom URL and live verification notes in README.
- [ ] Review the company's assessment policy and disclose assistance if required.

## Push the source

Run these commands inside the extracted project after creating an empty private repository on GitHub:

```bash
git init
git add .
git status
```

Inspect the staged files. `.env`, `node_modules`, SQLite data, and build artifacts should not be staged. Then:

```bash
git commit -m "Build automotive lifecycle AI agent with Zoho CRM integration"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_PRIVATE_REPO.git
git push -u origin main
```

Replace both placeholders. Confirm the repository is private on GitHub and that the evaluator has access. This handoff does not create a remote repository, invite anyone, deploy a server, or record a Loom video.
