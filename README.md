# Careflow Hospital Management

Careflow is a full-stack hospital operations MVP. It includes staff authentication and administration, patient registration/search, appointment scheduling/status updates, a dashboard, and a vital-sign form with patient history.

## Requirements

- Node.js 20 or newer and npm 10 or newer
- Docker Desktop with Compose, or another MongoDB 6+ development instance

## Run locally

1. Run `npm run setup:env` to create a gitignored `backend/.env` with random local secrets and the loopback MongoDB URI. The script will not overwrite an existing file. Never use production patient data for development or tests.
2. At the project root run `npm install`.
3. Start the local MongoDB container and both app services with `npm run dev:stack`. The Compose database binds only to loopback and stores its data in a named Docker volume.
4. Create the initial administrator once the API and MongoDB are available:

```sh
curl -X POST http://localhost:4000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"setupKey":"YOUR_ADMIN_SETUP_KEY","name":"Hospital Administrator","email":"admin@example.org","password":"use-a-long-unique-password"}'
```

5. Open http://localhost:5173 and sign in. Bootstrap is one-time and protected by an atomic database lock. Administrators can create staff accounts in the Team page.

The frontend uses `VITE_API_URL` if set, otherwise `http://localhost:4000/api`. The API uses `FRONTEND_ORIGIN` for CORS. Configure one trusted origin in production.

## Commands

Run at the project root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API and frontend in development mode |
| `npm run setup:env` | Create local backend settings and random development secrets once |
| `npm run dev:stack` | Start the local MongoDB container, API, and frontend |
| `npm run db:up` / `npm run db:down` | Start or stop local MongoDB; stopping keeps its data volume |
| `npm run build` | Syntax-check backend JavaScript and create the frontend production bundle |
| `npm test` | Run backend unit/API tests and frontend UI tests |
| `npm run lint` | Run backend and frontend ESLint checks |

## Included workflows

- Staff roles are administrator, doctor, nurse, and receptionist. All data routes require a signed, unexpired bearer token. Administrators manage staff. Doctors and nurses can access vitals and update patient/appointment records. Receptionists can register patients and schedule visits; blood type and allergy fields are hidden on their registration form and omitted from their patient-list response.
- Patient records include demographics/contact information, blood type, and allergy notes. Patient numbers and staff emails use unique indexes.
- Vital records capture systolic/diastolic pressure, pulse, temperature in °C, respiratory rate, oxygen saturation, optional weight in kg, height in cm, pain score, and notes. Records include a timestamp and staff author. API validation checks value ranges and requires diastolic pressure to be lower than systolic.
- Appointment records reference a patient and creating staff account. Care roles can mark visits scheduled, checked in, completed, or cancelled.
- Staff can change their password. Existing sessions are invalidated after a password change.

## API overview

- `GET /api/health` — API liveness and MongoDB connection state
- `POST /api/auth/bootstrap` — one-time initial administrator setup
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/password`
- `GET/POST /api/users` — administrator-only staff list/create
- `GET /api/dashboard`
- `GET/POST /api/patients`, `PATCH /api/patients/:id`
- `GET/POST /api/patients/:id/vitals` — administrator, doctor, and nurse roles
- `GET/POST /api/appointments`, `PATCH /api/appointments/:id/status`

Protected routes accept `Authorization: Bearer <token>`. Requests are size-limited and validated; authentication is rate-limited, Helmet sets security headers, and production errors avoid exposing stack details.

## Security and production readiness

This MVP is not a certified electronic health record and is **not ready for real patient data**. The bearer token is held in browser session storage. Before any production deployment, add and review audit history, MFA, password reset, fine-grained facility access, encrypted backups/at-rest configuration, and applicable privacy controls. Have the hospital security and privacy owners review the deployment. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for verification and open work.
