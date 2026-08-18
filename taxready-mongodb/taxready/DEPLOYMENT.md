# Deployment — Google Cloud Run + MongoDB Atlas

## Prerequisites

- A Google Cloud project with billing enabled
- APIs enabled: Cloud Run, Cloud Build, Vertex AI, Secret Manager, Cloud
  Storage, Cloud Logging, Cloud Monitoring
- A MongoDB Atlas account (or a self-hosted MongoDB cluster reachable from
  Cloud Run)
- (Optional) A Google Cloud OAuth client, if you want Google Sign-In in
  addition to email/password

## 1. MongoDB Atlas

1. Create a free or paid Atlas cluster.
2. Create a database user scoped to a `taxready` database with
   read/write privileges (not an admin account).
3. Under Network Access, restrict access to Cloud Run's egress IPs, or use
   Atlas's Private Endpoint / VPC peering rather than allowing all IPs.
4. Copy the connection string — this is your `MONGODB_URI`.
5. Create the recommended indexes (see `ARCHITECTURE.md` → "Recommended
   indexes") via `mongosh` or the Atlas UI.

## 2. Auth.js secrets

1. Generate a secret: `npx auth secret` (or `openssl rand -base64 32`) →
   this is `AUTH_SECRET`.
2. If you want Google Sign-In: create an OAuth 2.0 Client ID in Google
   Cloud Console → APIs & Services → Credentials, with an authorized
   redirect URI of `https://YOUR_DOMAIN/api/auth/callback/google`. Set
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Leaving these unset
   simply disables the Google button — email/password still works.

## 3. Vertex AI

1. Enable the Vertex AI API for your project.
2. Grant the Cloud Run service account the `Vertex AI User` role.
3. Set `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION`,
   `GOOGLE_CLOUD_PROJECT_ID`, and `GEMINI_MODEL`.
4. Leaving these unset falls back to `MockAIProvider` automatically — no
   code changes needed to deploy in demo-quality AI mode first and add
   real Gemini later.

## 4. Secret Manager

Store every credential as a secret, never a plain env var, in production:

```bash
gcloud secrets create taxready-mongodb-uri --data-file=./mongodb-uri.txt
gcloud secrets create taxready-auth-secret --data-file=./auth-secret.txt
gcloud secrets create taxready-google-client-secret --data-file=./google-client-secret.txt
```

Reference them from Cloud Run via `--set-secrets` (see `cloudbuild.yaml`).

## 5. Build and deploy

**Manual:**

```bash
docker build -t gcr.io/PROJECT_ID/taxready .
docker push gcr.io/PROJECT_ID/taxready
gcloud run deploy taxready \
  --image gcr.io/PROJECT_ID/taxready \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=MONGODB_URI=taxready-mongodb-uri:latest,AUTH_SECRET=taxready-auth-secret:latest \
  --set-env-vars=VERTEX_AI_LOCATION=europe-west4,GEMINI_MODEL=gemini-1.5-pro
```

**Via Cloud Build:**

```bash
gcloud builds submit --config=cloudbuild.yaml
```

**Via CI/CD:** push to `main` — see `.github/workflows/ci.yml`, which lints,
tests, builds, then submits `cloudbuild.yaml` using Workload Identity
Federation (no long-lived service account keys in GitHub).

## 6. Observability

Cloud Run automatically ships logs to Cloud Logging. For structured
application logs (AI failures, classification errors, report generation,
auth failures), use the `@google-cloud/logging` client already listed in
`package.json` and wrap it around the `console.error` calls in
`app/api/*/route.ts`.

## 7. Production readiness checklist

- [ ] MongoDB Atlas network access restricted (not `0.0.0.0/0`)
- [ ] MongoDB indexes created (see `ARCHITECTURE.md`)
- [ ] `AUTH_SECRET` generated and stored in Secret Manager
- [ ] Google OAuth redirect URI matches your production domain exactly
- [ ] Vertex AI credentials configured; `GeminiAIProvider` verified against
      a real transaction and receipt
- [ ] Secrets in Secret Manager, not committed or set as plain env vars
- [ ] Rate limiting added for `/api/auth/register` and AI endpoints
- [ ] Account/business/document deletion wired to real MongoDB deletes
      (Settings page UI exists; confirm the underlying routes are built)
- [ ] Cloud Run min instances set appropriately to avoid cold-start on the
      landing page
- [ ] Custom domain + TLS configured
- [ ] Error reporting and uptime checks configured in Cloud Monitoring
