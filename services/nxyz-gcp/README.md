# NXYZ GCP Control Plane

NXYZ GCP Control Plane is the Google Cloud deployment unit for governed registry, provenance, evidence, and policy-gated orchestration.

## Runtime

- Cloud Run
- Artifact Registry
- Firestore Native mode
- Secret Manager
- Cloud Logging / Monitoring
- GitHub Actions with Workload Identity Federation
- Default region: `us-east4` (Northern Virginia)

## API

Public endpoints:

- `GET /`
- `GET /healthz`

Protected endpoints require the `x-nxyz-api-key` header:

- `GET /v1/capabilities`
- `POST /v1/registry/bootstrap`
- `GET /v1/registry`
- `POST /v1/registry`
- `POST /v1/evidence`
- `POST /v1/orchestrate`
- `GET /v1/runs/:id`
- `POST /v1/runs/:id/approve`

`POST /v1/orchestrate` never executes an action directly. It creates a `PENDING_HUMAN_APPROVAL` run. Approval changes the run to `APPROVED`; downstream executors can later be added behind an explicit policy gate.

## Built-in registry entries

`POST /v1/registry/bootstrap` registers:

- NXYZ Horizons Evidence Gateway (`server/nxyz-horizons.ts`)
- ZYRA Core
- XUNIA
- GPT-Doug

## Local container build

```bash
docker build -t nxyz-control:local services/nxyz-gcp

docker run --rm \
  -p 8080:8080 \
  -e GOOGLE_CLOUD_PROJECT="your-gcp-project" \
  -e NXYZ_API_KEY="local-development-key" \
  -e NXYZ_ENV="development" \
  nxyz-control:local
```

The Firestore-backed routes require Google Application Default Credentials when run locally. The health endpoint does not access Firestore.

## GCP bootstrap

From the repository root:

```bash
PROJECT_ID="your-project-id" \
BILLING_ACCOUNT="XXXXXX-XXXXXX-XXXXXX" \
bash infra/gcp/bootstrap-nxyz.sh
```

The bootstrap script creates or configures the project resources, NXYZ API secret, runtime/deployer service accounts, Workload Identity Federation, and GitHub Actions variables when the GitHub CLI is authenticated.

## Deployment

After bootstrap, pushing changes that touch `services/nxyz-gcp/**`, `infra/gcp/**`, or the NXYZ workflow on `main` runs `.github/workflows/nxyz-gcp-deploy.yml`.

The workflow:

1. Authenticates to GCP with GitHub OIDC / Workload Identity Federation.
2. Builds `services/nxyz-gcp/Dockerfile`.
3. Pushes the immutable commit-tagged image to Artifact Registry.
4. Deploys `nxyz-control` to Cloud Run.
5. Injects `nxyz-api-key` from Secret Manager.
6. Verifies `/healthz`.
7. Writes the Cloud Run URL and image URI to the GitHub Actions job summary.

## Scaling defaults

- CPU: 1
- Memory: 512 MiB
- Concurrency: 40
- Minimum instances: 0
- Maximum instances: 10
- Timeout: 60 seconds

These settings deliberately optimize the first production deployment for low idle cost while retaining automatic scale-out.
