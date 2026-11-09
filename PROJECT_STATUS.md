# Project status

Updated: 2026-11-09

## Overall status

**MVP implemented; production readiness remains in progress.** The frontend build, backend syntax build, unit/API tests, and lint pass. MongoDB CRUD integration has not been verified because no development database is configured. Do not use real patient data yet.

## Implemented

- Responsive React/TypeScript staff portal with overview, patient registration/search, appointments, vital capture/history, and administrator Team page.
- Express/Mongoose API with patient, appointment, vital, staff, and one-time bootstrap-lock models.
- Password hashing, JWT authentication/expiry, password changes with old-session invalidation, role authorization, request validation, auth rate limiting, Helmet, and central error handling.
- Vital ranges and blood pressure relationship validation; vital record attribution and timestamps.
- Receptionist patient registration hides blood type and allergies; their patient-list responses omit those fields.
- `README.md`, environment templates, npm scripts, and generated lockfile.
- Local development MongoDB Compose configuration with loopback-only port binding and persistent named volume.
- A one-time `npm run setup:env` command that creates gitignored random development secrets and a localhost Mongo URI without overwriting existing configuration.

## Verification

| Area | Status | Result |
| --- | --- | --- |
| Backend build | PASS | All backend source JavaScript syntax checks pass. |
| Frontend production build | PASS | TypeScript check and Vite bundle succeed. |
| Backend unit/API tests | PASS | 9 tests pass, covering auth rejection and expiry, malformed bootstrap request, 404s, pagination, literal search, and blood-pressure relationship. |
| Frontend UI tests | PASS | 2 tests pass for the accessible sign-in form and vital-entry form. |
| Lint | PASS | Backend and frontend ESLint checks pass. |
| Manual browser/console review | BLOCKED | The local Vite process did not remain available to the browser tool in this environment; automated UI tests and production bundle pass. |
| MongoDB integration | BLOCKED | Docker and MongoDB are not installed in this environment. Compose config is ready, but the database cannot be started here; schema/index and CRUD behavior need isolated DB verification. |
| Role enforcement/expired sessions | PARTIALLY VERIFIED | Missing, invalid, and expired token responses are tested. DB-backed role denials still need integration coverage. |
| Full dependency audit | FAIL | 3 moderate findings are confined to the development-only TypeScript parser/minimatch dependency chain. The suggested forced fix downgrades parser across a major version; it was not applied. |
| Production dependency audit | PASS | `npm audit --omit=dev` reported no production vulnerabilities. |

## Commands executed

- `node --version` — PASS, `v22.17.1`.
- `npm.cmd --version` — PASS, `10.9.2`.
- `npm.cmd install` — PASS; dependencies installed and `package-lock.json` generated.
- `npm.cmd run build` — PASS; backend syntax checks and frontend TypeScript/production build passed.
- `npm.cmd test` — PASS; 9 backend tests and 2 frontend tests passed. API tests required permission to bind a local ephemeral HTTP socket.
- `npm.cmd run lint` — PASS; backend and frontend.
- `npm.cmd audit` — FAIL; 3 moderate dev-tool findings in minimatch via `@typescript-eslint/typescript-estree`.
- `npm.cmd audit --omit=dev` — PASS; 0 production dependency findings.
- `node --check scripts/setup-env.js` and local `.env` structure/secret-length check — PASS; actual random values are ignored by Git and were not printed.
- Compose YAML parser check — PASS.
- `npm.cmd run db:up` — BLOCKED; Docker CLI is not installed (`'docker' is not recognized`).

## Known gaps and next steps

1. Configure a dedicated development MongoDB; verify `/api/health`, indexes, CRUD, duplicates, relationships, and error paths with an isolated test database.
2. Add database-backed API tests for role denial, duplicates, vital range validation, and data visibility by role.
3. Resolve the moderate dev-tool audit findings through a supported TypeScript parser dependency update; avoid the audit tool's breaking downgrade suggestion.
4. Add patient editing UI, account deactivation, password reset, MFA, and audit history.
5. Review patient-data handling, backups, encryption, access policy, and regulatory requirements with the hospital before deployment.

## Security limitations

This is an MVP, not a certified electronic health record. JWTs are stored in session storage. Audit history, MFA, password reset, fine-grained facility permissions, production backup/encryption configuration, and formal privacy/security review are still required before handling real patient records.
