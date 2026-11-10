# Free deployment guide

This guide is for a **demo or development system only**. Do not put real patient data into a free hosting account: the free services lack the contractual, backup, access-control, and security guarantees required for a real hospital deployment.

## 1. Publish the code

Create a private GitHub repository, then push this project to it. Keep `backend/.env` out of Git; it contains secrets.

## 2. Create the database

1. Create a MongoDB Atlas project and select a Free (M0) cluster.
2. Create an application database user with a long, unique password.
3. In Network Access, add Render's outbound access approach appropriate for your account. Do not permanently allow all IP addresses for a production system.
4. Copy the connection string and replace the database name with `careflow`.

## 3. Deploy the API on Render

1. Sign in to Render and choose **New → Blueprint**.
2. Select the GitHub repository. Render reads `render.yaml` and creates the API service.
3. Set `MONGODB_URI` to the Atlas connection string.
4. After its first deployment, copy the API URL, for example `https://careflow-api.onrender.com`.

## 4. Deploy the portal on Cloudflare Pages

1. In Cloudflare Pages, create a project from the same repository.
2. Use these build settings:
   - Root directory: `frontend`
   - Build command: `npm install && npm run build`
   - Output directory: `dist`
3. Add a build variable named `VITE_API_URL`, with the value `https://YOUR-API-URL/api`.
4. Deploy and copy the Pages URL.

## 5. Finish the connection

1. In Render, set `FRONTEND_ORIGIN` to the exact Cloudflare Pages URL, without a trailing slash.
2. Redeploy the API.
3. Visit the Pages URL and verify that its system indicator says **System online**.
4. Bootstrap the first administrator using the `ADMIN_SETUP_KEY` from Render, following the command in the README. Treat this key and the password as secrets.

## Before using outside a demo

Obtain privacy/security approval, establish encrypted backups and restore tests, add MFA and password-reset delivery, set up monitoring, limit database network access, and review applicable health-data regulations. Free services can sleep, have quotas, and are not suitable for a clinical production environment.
