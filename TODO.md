# VeaHome TODO

Use this checklist to track the work remaining before the next milestone. Tasks are grouped by area; strike-through when complete.

## Backend
- [ ] **Auth hardening**: add password reset, account lockout, and audit logging.
- [ ] **Home access control**: enforce membership + role checks in every home-scoped controller.
- [ ] **Device telemetry ingestion**: persist live telemetry to Influx and surface summarized stats via REST.
- [ ] **MQTT topic governance**: document and validate topic names, add server-side rate limiting.
- [ ] **Validation coverage**: ensure every request body has a Joi schema (devices, schedules, automations, hub flows).
- [ ] **Node-RED sync retries**: queue failed automation/schedule syncs for retry instead of immediate failure.
- [ ] **Automated tests**: add unit tests for repositories and integration tests for critical routes.

## Frontend
- [ ] **Realtime state wiring**: hook `useRealtime` into device cards, scenes, and energy widgets.
- [ ] **Device onboarding polish**: finish hub pairing wizard flows with backend error display + retry logic.
- [ ] **Access management UI**: add invite/remove member flows per home.
- [ ] **Automation builder UX**: include condition templates, schedule previews, and validation before saving.
- [ ] **Offline handling**: cache last-known device states and show degraded controls when MQTT down.
- [ ] **End-to-end testing**: cover navigation + core flows with Detox or Playwright.

## Platform & Ops
- [ ] **Env documentation**: capture required env vars, secrets management, and sample `.env` files.
- [ ] **CI/CD**: configure lint/test/build pipelines for both frontend and backend.
- [ ] **Monitoring & alerts**: add health endpoints, structured logging, and alert policies for MQTT failures.
- [ ] **Release automation**: script over-the-air updates (Expo) and backend deployments.



