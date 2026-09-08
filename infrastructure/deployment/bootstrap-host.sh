#!/usr/bin/env bash

set -euo pipefail

readonly COMPOSE_VERSION="v5.5.0"
readonly COMPOSE_SHA256="c57ab918abd5b05ca7e7d0f275875dd1330a695074f309dc9eab1b49efafcd4b"
readonly COMPOSE_BINARY="docker-compose-linux-x86_64"
readonly COMPOSE_URL="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/${COMPOSE_BINARY}"
readonly COMPOSE_PLUGIN="/usr/local/lib/docker/cli-plugins/docker-compose"

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "This bootstrap expects the x86_64 c7i-flex instance." >&2
  exit 1
fi

dnf install -y docker jq

install -d -m 0755 /etc/docker
cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
JSON

install -d -m 0755 "$(dirname "${COMPOSE_PLUGIN}")"
compose_download="$(mktemp)"
trap 'rm -f "${compose_download}"' EXIT
curl --fail --silent --show-error --location "${COMPOSE_URL}" --output "${compose_download}"
echo "${COMPOSE_SHA256}  ${compose_download}" | sha256sum --check --status
install -m 0755 "${compose_download}" "${COMPOSE_PLUGIN}"

install -d -m 0755 /opt/race-restapi
install -d -m 0700 /etc/race-restapi

systemctl enable --now docker
systemctl restart docker
systemctl disable --now sshd

docker version
docker compose version
aws --version
