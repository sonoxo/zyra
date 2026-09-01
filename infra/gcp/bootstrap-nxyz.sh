#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-${1:-}}"
REGION="${REGION:-us-east4}"
FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-us-east4}"
REPOSITORY="${REPOSITORY:-nxyz}"
SERVICE="${SERVICE:-nxyz-control}"
RUNTIME_SA="${RUNTIME_SA:-nxyz-runtime}"
DEPLOY_SA="${DEPLOY_SA:-nxyz-github-deployer}"
WIF_POOL_ID="${WIF_POOL_ID:-github}"
WIF_PROVIDER_ID="${WIF_PROVIDER_ID:-zyra}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-sonoxo/zyra}"
SECRET_NAME="${SECRET_NAME:-nxyz-api-key}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is required. Example: PROJECT_ID=nxyz-prod-123 ./infra/gcp/bootstrap-nxyz.sh" >&2
  exit 1
fi

for command in gcloud openssl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

echo "==> NXYZ GCP bootstrap"
echo "project:  $PROJECT_ID"
echo "region:   $REGION"
echo "repo:     $GITHUB_REPOSITORY"

if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$PROJECT_ID" --name="NXYZ"
fi

if [[ -n "${BILLING_ACCOUNT:-}" ]]; then
  gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT"
fi

gcloud config set project "$PROJECT_ID" >/dev/null

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="NXYZ container images" \
    --project="$PROJECT_ID"
fi

if ! gcloud firestore databases describe \
  --database="(default)" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud firestore databases create \
    --database="(default)" \
    --location="$FIRESTORE_LOCATION" \
    --type=firestore-native \
    --project="$PROJECT_ID"
fi

if ! gcloud iam service-accounts describe \
  "${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA" \
    --display-name="NXYZ Cloud Run Runtime" \
    --project="$PROJECT_ID"
fi

if ! gcloud iam service-accounts describe \
  "${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$DEPLOY_SA" \
    --display-name="NXYZ GitHub Deployer" \
    --project="$PROJECT_ID"
fi

RUNTIME_SA_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA_EMAIL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

for role in roles/datastore.user roles/logging.logWriter roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

if ! gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
  NXYZ_API_KEY_VALUE="${NXYZ_API_KEY_VALUE:-$(openssl rand -hex 32)}"
  printf '%s' "$NXYZ_API_KEY_VALUE" | gcloud secrets create "$SECRET_NAME" \
    --replication-policy=automatic \
    --data-file=- \
    --project="$PROJECT_ID"
  echo "Created $SECRET_NAME in Secret Manager."
fi

gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

for role in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
    --role="$role" \
    --condition=None \
    --quiet >/dev/null
done

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA_EMAIL" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

if ! gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
  --location=global \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$WIF_POOL_ID" \
    --location=global \
    --display-name="GitHub Actions" \
    --project="$PROJECT_ID"
fi

if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
  --workload-identity-pool="$WIF_POOL_ID" \
  --location=global \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER_ID" \
    --workload-identity-pool="$WIF_POOL_ID" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPOSITORY}'" \
    --display-name="${GITHUB_REPOSITORY}" \
    --project="$PROJECT_ID"
fi

POOL_NAME="$(gcloud iam workload-identity-pools describe "$WIF_POOL_ID" \
  --location=global \
  --project="$PROJECT_ID" \
  --format='value(name)')"

WIF_PROVIDER="$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER_ID" \
  --workload-identity-pool="$WIF_POOL_ID" \
  --location=global \
  --project="$PROJECT_ID" \
  --format='value(name)')"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${GITHUB_REPOSITORY}" \
  --project="$PROJECT_ID" \
  --quiet >/dev/null

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh variable set GCP_PROJECT_ID --repo "$GITHUB_REPOSITORY" --body "$PROJECT_ID"
  gh variable set GCP_WIF_PROVIDER --repo "$GITHUB_REPOSITORY" --body "$WIF_PROVIDER"
  gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --repo "$GITHUB_REPOSITORY" --body "$DEPLOY_SA_EMAIL"
  gh variable set NXYZ_RUNTIME_SERVICE_ACCOUNT --repo "$GITHUB_REPOSITORY" --body "$RUNTIME_SA_EMAIL"
  gh variable set GCP_REGION --repo "$GITHUB_REPOSITORY" --body "$REGION"
  gh variable set GCP_ARTIFACT_REPOSITORY --repo "$GITHUB_REPOSITORY" --body "$REPOSITORY"
  echo "GitHub Actions variables configured for $GITHUB_REPOSITORY."
else
  echo "GitHub CLI is not authenticated; copy these values into repository Actions variables:"
  echo "GCP_PROJECT_ID=$PROJECT_ID"
  echo "GCP_WIF_PROVIDER=$WIF_PROVIDER"
  echo "GCP_DEPLOY_SERVICE_ACCOUNT=$DEPLOY_SA_EMAIL"
  echo "NXYZ_RUNTIME_SERVICE_ACCOUNT=$RUNTIME_SA_EMAIL"
  echo "GCP_REGION=$REGION"
  echo "GCP_ARTIFACT_REPOSITORY=$REPOSITORY"
fi

cat <<SUMMARY

NXYZ GCP bootstrap complete.

Project:             $PROJECT_ID
Region:              $REGION
Artifact Registry:   $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY
Runtime identity:    $RUNTIME_SA_EMAIL
Deploy identity:     $DEPLOY_SA_EMAIL
WIF provider:        $WIF_PROVIDER
Firestore:           (default) / $FIRESTORE_LOCATION
Secret:              $SECRET_NAME

Push to main (or manually run the NXYZ GCP workflow) to build and deploy Cloud Run.
SUMMARY
