# Production host preparation

`bootstrap-host.sh` prepares the Amazon Linux 2023 EC2 host without deploying
the application or writing credentials:

- installs Docker Engine from the Amazon Linux repository;
- installs a pinned Docker Compose CLI plugin and verifies its SHA-256 digest;
- limits local container log growth;
- enables Docker on boot;
- disables SSH because administration uses Systems Manager;
- creates `/opt/race-restapi` for deployment manifests; and
- creates root-only `/etc/race-restapi` for runtime configuration.

Run it as root through AWS Systems Manager. Port 22 remains closed.

Application deployment is a separate step because it requires published ECR
images, a production Compose manifest, runtime secrets, and the Caddy proxy.
