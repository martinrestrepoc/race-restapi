#!/usr/bin/env bash

set -Eeuo pipefail

readonly IMAGE_TAG="${1:-}"
readonly AWS_REGION="us-east-1"
readonly AWS_ACCOUNT_ID="850252650610"
readonly ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
readonly PARAMETER_PREFIX="/race-restapi/production"
readonly DEPLOYMENT_DIR="/opt/race-restapi"
readonly CONFIGURATION_DIR="/etc/race-restapi"
readonly ENV_FILE="${CONFIGURATION_DIR}/production.env"
readonly COMPOSE_FILE="${DEPLOYMENT_DIR}/compose.production.yml"
readonly SOURCE_ARCHIVE="https://github.com/martinrestrepoc/race-restapi/archive/${IMAGE_TAG}.tar.gz"

if [[ ! "${IMAGE_TAG}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "The image tag must be a full Git commit SHA." >&2
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "This deployment must run as root through Systems Manager." >&2
  exit 1
fi

install -d -m 0755 "${DEPLOYMENT_DIR}"
install -d -m 0700 "${CONFIGURATION_DIR}"

temporary_directory="$(mktemp -d)"
previous_environment="${temporary_directory}/previous.env"
parameter_response="${temporary_directory}/parameters.json"
candidate_environment="${temporary_directory}/production.env"
had_previous_environment=false

cleanup() {
  rm -rf "${temporary_directory}"
}

rollback() {
  status=$?
  trap - ERR

  echo "Deployment failed; inspecting service state." >&2
  docker compose \
    --project-name race-restapi-production \
    --env-file "${ENV_FILE}" \
    --file "${COMPOSE_FILE}" \
    ps >&2 || true

  if [[ "${had_previous_environment}" == "true" ]]; then
    echo "Restoring the previous image release." >&2
    install -m 0600 "${previous_environment}" "${ENV_FILE}"
    docker compose \
      --project-name race-restapi-production \
      --env-file "${ENV_FILE}" \
      --file "${COMPOSE_FILE}" \
      up --detach --remove-orphans --wait --wait-timeout 360 || true
  fi

  exit "${status}"
}

trap cleanup EXIT
trap rollback ERR

curl --fail --silent --show-error --location \
  "${SOURCE_ARCHIVE}" \
  --output "${temporary_directory}/source.tar.gz"
mkdir "${temporary_directory}/source"
tar \
  --extract \
  --gzip \
  --file "${temporary_directory}/source.tar.gz" \
  --directory "${temporary_directory}/source" \
  --strip-components 1

install -m 0644 \
  "${temporary_directory}/source/infrastructure/deployment/compose.production.yml" \
  "${COMPOSE_FILE}"
install -m 0644 \
  "${temporary_directory}/source/infrastructure/deployment/Caddyfile" \
  "${DEPLOYMENT_DIR}/Caddyfile"
install -m 0755 \
  "${temporary_directory}/source/infrastructure/postgres/provision-keycloak-database.sh" \
  "${DEPLOYMENT_DIR}/provision-keycloak-database.sh"

parameter_names=(
  "${PARAMETER_PREFIX}/POSTGRES_PASSWORD"
  "${PARAMETER_PREFIX}/KEYCLOAK_DB_PASSWORD"
  "${PARAMETER_PREFIX}/KEYCLOAK_ADMIN_PASSWORD"
)

aws ssm get-parameters \
  --region "${AWS_REGION}" \
  --names "${parameter_names[@]}" \
  --with-decryption \
  --output json >"${parameter_response}"

if [[ "$(jq '.InvalidParameters | length' "${parameter_response}")" -ne 0 ]]; then
  echo "One or more required production parameters do not exist." >&2
  exit 1
fi

if [[ "$(jq '.Parameters | length' "${parameter_response}")" -ne "${#parameter_names[@]}" ]]; then
  echo "AWS did not return every required production parameter." >&2
  exit 1
fi

while IFS= read -r secret_value; do
  if [[ ! "${secret_value}" =~ ^[A-Za-z0-9._~-]{24,}$ ]]; then
    echo "Production passwords must contain at least 24 dotenv-safe characters." >&2
    exit 1
  fi
done < <(jq -r '.Parameters[].Value' "${parameter_response}")

umask 077
{
  printf 'AWS_REGION=%s\n' "${AWS_REGION}"
  printf 'ECR_REGISTRY=%s\n' "${ECR_REGISTRY}"
  printf 'IMAGE_TAG=%s\n' "${IMAGE_TAG}"
  jq -r '.Parameters | sort_by(.Name)[] | "\(.Name | split("/")[-1])=\(.Value)"' \
    "${parameter_response}"
} >"${candidate_environment}"

if [[ -f "${ENV_FILE}" ]]; then
  cp "${ENV_FILE}" "${previous_environment}"
  had_previous_environment=true
fi

install -m 0600 "${candidate_environment}" "${ENV_FILE}"

aws ecr get-login-password --region "${AWS_REGION}" |
  docker login --username AWS --password-stdin "${ECR_REGISTRY}"

docker compose \
  --project-name race-restapi-production \
  --env-file "${ENV_FILE}" \
  --file "${COMPOSE_FILE}" \
  config --quiet

docker compose \
  --project-name race-restapi-production \
  --env-file "${ENV_FILE}" \
  --file "${COMPOSE_FILE}" \
  pull

docker compose \
  --project-name race-restapi-production \
  --env-file "${ENV_FILE}" \
  --file "${COMPOSE_FILE}" \
  up --detach --remove-orphans --wait --wait-timeout 360

# The admin API is disabled; restart to load the updated bind-mounted Caddyfile.
docker compose \
  --project-name race-restapi-production \
  --env-file "${ENV_FILE}" \
  --file "${COMPOSE_FILE}" \
  restart caddy

curl \
  --fail \
  --silent \
  --show-error \
  --retry 12 \
  --retry-all-errors \
  --retry-delay 5 \
  https://app.sebaslacabra.lat/healthz >/dev/null
curl \
  --fail \
  --silent \
  --show-error \
  --retry 12 \
  --retry-all-errors \
  --retry-delay 5 \
  https://auth.sebaslacabra.lat/realms/race-management/.well-known/openid-configuration >/dev/null

docker image prune --force >/dev/null

trap - ERR
echo "Successfully deployed image tag ${IMAGE_TAG}."
