# Changelog

## 1.1.0 — 2026-11-09 — Vital signs and staff workflows

- Added a vital-sign form and patient history for blood pressure, pulse, temperature, respiratory rate, oxygen saturation, weight, height, pain score, and notes.
- Added administrator staff creation/listing, password changes with session invalidation, and appointment status controls.
- Restricted vital access to care roles, hid clinical fields from receptionist registration, and omitted them from receptionist patient-list responses.
- Added frontend sign-in/vital-form UI tests and backend HTTP/unit tests, including expired-token rejection.
- Frontend production build, backend syntax build, test suite, and lint pass. MongoDB integration is pending; full audit reports 3 moderate development-only dependency findings.

## 1.0.0 — 2026-11-09 — Initial MVP

- Created the Careflow monorepo with React/TypeScript frontend and Express/MongoDB backend.
- Added initial administrator bootstrap, password hashing, JWT authentication, patient registration/search, appointment scheduling, and a summary dashboard.
- Added environment templates and setup documentation.
