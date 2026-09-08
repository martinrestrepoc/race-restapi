# Production deployment

Production runs on one Amazon Linux 2023 EC2 instance and exposes only ports 80
and 443. Caddy terminates TLS and routes the two public hosts:

- `https://app.sebaslacabra.lat` -> frontend Nginx -> NestJS for `/api/*`;
- `https://auth.sebaslacabra.lat` -> Keycloak.

PostgreSQL, Keycloak, NestJS and frontend Nginx are reachable only on the private
Compose network. Caddy obtains and renews public certificates automatically; its
certificate state and both databases use named Docker volumes on the EC2 disk.

## Host preparation

`bootstrap-host.sh` installs Docker Engine and a checksum-verified, pinned Docker
Compose plugin, limits container log growth, enables Docker on boot, disables SSH,
and creates the deployment directories. It does not deploy the application or
write credentials. It is run as root through AWS Systems Manager.

## Images and configuration

`publish.yml` publishes backend, frontend and customized Keycloak images to
immutable ECR tags named with the full tested Git commit SHA. The production
Keycloak image contains the login theme and a production realm without demo users
or the Postman client.

The EC2 runtime role reads these three encrypted `SecureString` parameters:

```text
/race-restapi/production/POSTGRES_PASSWORD
/race-restapi/production/KEYCLOAK_DB_PASSWORD
/race-restapi/production/KEYCLOAK_ADMIN_PASSWORD
```

Each value must have at least 24 characters and use only letters, numbers, `.`,
`_`, `~`, or `-`. This restriction makes the generated dotenv file unambiguous.
Do not commit the real values. Changing database passwords in Parameter Store
does not rotate credentials inside an already initialized PostgreSQL volume; use a
coordinated database password-rotation procedure instead.

Before enabling automatic deployment, configure these non-secret GitHub repository
variables:

```text
AWS_REGION=us-east-1
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::850252650610:role/GitHubActionsRaceRestApiDeployer
PRODUCTION_INSTANCE_ID=i-08806bbce0d653238
```

## Release flow

After `Publish` succeeds on `main`, `deploy.yml`:

1. resolves the exact tested commit SHA;
2. verifies that all three images exist in ECR;
3. assumes the dedicated deployer role through GitHub OIDC;
4. sends a small, checksum-verified deployment command through SSM;
5. downloads the deployment manifests from that immutable Git commit;
6. reads encrypted parameters using the EC2 runtime role;
7. pulls and starts the exact ECR images; and
8. verifies the application and Keycloak through public HTTPS.

`deploy-release.sh` keeps the preceding environment file and attempts to restore
the previous image tag if a later release fails. It never prints parameter values.
The manual workflow requires an existing 40-character image tag and is the normal
rollback mechanism.

The first Keycloak start creates only the realm, clients and roles. Sign in to the
Keycloak administration console with `keycloak-admin`, create application users,
and assign the corresponding `race-backend` client roles. Realm imports do not
overwrite an existing realm on later deployments.

An authorized operator can retrieve the generated bootstrap password only when it
is needed; the command prints a secret, so do not paste its output into chat, logs,
issues, or source files:

```bash
aws ssm get-parameter \
  --profile race-restapi-admin \
  --region us-east-1 \
  --name /race-restapi/production/KEYCLOAK_ADMIN_PASSWORD \
  --with-decryption \
  --query Parameter.Value \
  --output text
```

## Current operational limits

This is a single-host learning deployment. EC2, its retained EBS volume and its
Elastic IP can incur charges. There is no high availability, automatic database
backup, tested disaster recovery, external monitoring, or zero-downtime migration.
Take an EBS snapshot before destructive migrations and stop deployment if disk or
memory pressure appears.
