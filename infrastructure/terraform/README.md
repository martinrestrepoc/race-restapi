# AWS production infrastructure

Configuración revisable para `850252650610`, exclusivamente en `us-east-1`.
La infraestructura está aplicada y su estado remoto se almacena en S3. Los
recursos creados inicialmente en consola fueron adoptados mediante `imports.tf`;
los bloques se conservan para documentar esa procedencia.

## Estructura y alcance

| Archivo | Responsabilidad |
| --- | --- |
| `versions.tf`, `.terraform.lock.hcl` | Versiones, proveedor AWS y bloqueo de cuenta |
| `backend.tf` | Estado remoto cifrado en S3 con bloqueo nativo |
| `bootstrap/` | Módulo separado que crea y protege el bucket de estado |
| `variables.tf`, `locals.tf` | AMI, CIDR y tags de producción |
| `ecr.tf` | Tres repositorios de imágenes, tags inmutables y sin borrado forzado |
| `iam.tf` | OIDC y roles separados para publicar, desplegar y ejecutar la aplicación |
| `network.tf` | VPC dedicada, subnet pública, Internet Gateway, rutas y security group |
| `compute.tf` | Consulta del key pair, AMI oficial, EC2 y Elastic IP |
| `imports.tf` | Once importaciones declarativas de recursos existentes |
| `outputs.tf` | ID de instancia, IP, URIs ECR, AMI, roles y registros DNS manuales |

Se crea una VPC dedicada `10.42.0.0/16` y su primera subnet `/24`, sin asumir que
existe una VPC por defecto ni alterar redes existentes. La AZ se selecciona entre
las habilitadas que ofrecen `c7i-flex.large`; la oferta no garantiza capacidad.
La subnet no asigna IP pública automática: la EC2 utiliza únicamente la EIP.
No se crean NAT Gateway, balanceador, RDS ni recursos de DNS.

La EC2 usa AL2023 **estándar**, de Amazon, x86_64, `c7i-flex.large`, disco raíz
gp3 de 30 GiB cifrado con la clave EBS predeterminada, IMDSv2 obligatorio y hop
limit 2. El volumen se conserva si posteriormente se termina la instancia.
El arranque de Terraform habilita SSM Agent, incluido en la AMI estándar.
Docker y Compose se preparan aparte mediante Systems Manager; la aplicación se
administra mediante el workflow de despliegue.

El único SG asociado permite entrada IPv4 TCP 80 y 443. No hay IPv6 ni entrada
SSH, 3000, 5432, 5433, 8080 o 5173. La salida IPv4 es abierta para SSM, ECR,
descarga de capas y actualizaciones; no implica entrada pública adicional.
Los recursos etiquetables llevan `Project=race-restapi`,
`Environment=production`, `ManagedBy=Terraform`, incluido el volumen raíz.

## Prerrequisitos y comprobaciones de solo lectura

Terraform >= 1.7 y < 2, proveedor `hashicorp/aws` 6.x bloqueado en el lockfile,
AWS CLI y una sesión AWS temporal con permisos de inventario para preparar el
plan. Usar el mecanismo normal de credenciales del proveedor (por ejemplo,
perfil SSO); no colocar claves AWS en HCL, tfvars o Git. El rol publisher de
GitHub **no** es un rol de Terraform y carece de permisos de infraestructura.
Antes de inicializar este módulo, crear el backend siguiendo
[`bootstrap/README.md`](bootstrap/README.md) y migrar allí el estado bootstrap.

Desde la raíz del repositorio, con AWS CLI configurado:

```bash
aws sts get-caller-identity --query Account --output text
aws ec2 describe-key-pairs --region us-east-1 --key-names race-restapi-production --query 'KeyPairs[].{Name:KeyName,Id:KeyPairId,Fingerprint:KeyFingerprint}'
aws ecr describe-repositories --region us-east-1 --repository-names race-restapi-backend race-restapi-frontend race-restapi-keycloak
aws iam get-open-id-connect-provider --open-id-connect-provider-arn arn:aws:iam::850252650610:oidc-provider/token.actions.githubusercontent.com
aws iam get-role --role-name GitHubActionsRaceRestApiPublisher
aws iam get-role --role-name RaceRestApiRuntimeRole
aws iam list-attached-role-policies --role-name GitHubActionsRaceRestApiPublisher
aws iam list-attached-role-policies --role-name RaceRestApiRuntimeRole
aws iam list-role-policies --role-name GitHubActionsRaceRestApiPublisher
aws iam list-role-policies --role-name RaceRestApiRuntimeRole
aws iam get-policy --policy-arn arn:aws:iam::850252650610:policy/RaceRestApiEcrPublisher
aws iam get-policy --policy-arn arn:aws:iam::850252650610:policy/RaceRestApiEcrPuller
aws iam list-instance-profiles-for-role --role-name RaceRestApiRuntimeRole
aws iam get-instance-profile --instance-profile-name RaceRestApiRuntimeRole
```

El primer comando debe devolver `850252650610`; detenerse si devuelve otra cuenta.
Para cada policy consultar además su documento con `aws iam get-policy-version
--policy-arn ARN --version-id VERSION`, usando `DefaultVersionId` de `get-policy`.
Si existen policies inline, revisar cada una con `aws iam get-role-policy`.
Revisar también tags de IAM/ECR con sus comandos `list-*-tags` / `list-tags-for-resource`.
No confundir un error `AccessDenied` con la inexistencia de un recurso.

`data.aws_key_pair.production` hará la consulta del key pair en el futuro plan;
no crea ni importa claves, y no pide siquiera su contenido público. Nunca se
lee, genera, copia o carga el PEM privado. La clave no habilita el puerto 22;
la administración se realiza mediante Session Manager con permisos del operador.

## Importación realizada sin recreación

Los bloques activos de `imports.tf` son estas once operaciones:

| Dirección Terraform | Identificador de importación |
| --- | --- |
| `aws_ecr_repository.images["race-restapi-backend"]` | `race-restapi-backend` |
| `aws_ecr_repository.images["race-restapi-frontend"]` | `race-restapi-frontend` |
| `aws_iam_openid_connect_provider.github` | `arn:aws:iam::850252650610:oidc-provider/token.actions.githubusercontent.com` |
| `aws_iam_policy.publisher` | `arn:aws:iam::850252650610:policy/RaceRestApiEcrPublisher` |
| `aws_iam_role.publisher` | `GitHubActionsRaceRestApiPublisher` |
| `aws_iam_role_policy_attachment.publisher` | `GitHubActionsRaceRestApiPublisher/arn:aws:iam::850252650610:policy/RaceRestApiEcrPublisher` |
| `aws_iam_policy.puller` | `arn:aws:iam::850252650610:policy/RaceRestApiEcrPuller` |
| `aws_iam_role.runtime` | `RaceRestApiRuntimeRole` |
| `aws_iam_instance_profile.runtime` | `RaceRestApiRuntimeRole` |
| `aws_iam_role_policy_attachment.runtime_ecr` | `RaceRestApiRuntimeRole/arn:aws:iam::850252650610:policy/RaceRestApiEcrPuller` |
| `aws_iam_role_policy_attachment.runtime_ssm` | `RaceRestApiRuntimeRole/arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore` |

`AmazonSSMManagedInstanceCore` pertenece a AWS: solo se importa su asociación,
no su definición. Los ARN anteriores presuponen policies con path `/`; verificar
los ARN reales y ajustar HCL/imports si existen paths distintos.

El instance profile es un recurso distinto del rol. Su existencia con el nombre
`RaceRestApiRuntimeRole` se confirmó en el selector de perfiles IAM del asistente
de lanzamiento de EC2 y por eso se incluye en las importaciones. Antes del plan,
el inventario debe confirmar además que contiene el rol correcto.

La adopción inicial ya fue aplicada. Para cambios posteriores, usar el flujo normal
de revisión y detenerse ante cualquier destrucción o reemplazo inesperado:

```bash
terraform -chdir=infrastructure/terraform init -input=false
terraform -chdir=infrastructure/terraform fmt -check -recursive
terraform -chdir=infrastructure/terraform validate
AWS_PROFILE=race-restapi-admin terraform -chdir=infrastructure/terraform plan -input=false -out=review.tfplan
terraform -chdir=infrastructure/terraform show -no-color review.tfplan
```

`init`, `fmt` y `validate` no importan. Un plan con bloques `import` solo muestra
una adopción que falte en el estado; `apply` importaría y también aplicaría los
demás cambios del plan. Los bloques se pueden conservar después de adoptar.

## IAM y compatibilidad con publicación

El trust del publisher exige audience `sts.amazonaws.com` y el subject exacto
`repo:martinrestrepoc@195827900/race-restapi@1310204506:ref:refs/heads/main`,
incluyendo los IDs inmutables que GitHub usa en el prefijo del repositorio. Esto
es coherente con el remoto y el workflow actual sin GitHub Environment. Cambiar
de repositorio o rama requiere revisar el subject. El deployer usa el subject
separado del Environment `production`; no se permiten forks/PRs ni `repo:*`.

El publisher puede autenticar ECR y leer/publicar únicamente en los tres
repositorios. `BatchGetImage` cubre la comprobación de tags ya publicados.
El deployer comprueba esas imágenes y envía únicamente `AWS-RunShellScript` a la
EC2 de producción. El runtime solo puede autenticar/descargar esas imágenes,
usar SSM y leer parámetros bajo `/race-restapi/production/*`.
`ecr:GetAuthorizationToken` requiere `Resource="*"`; las operaciones de
repositorio se restringen a tres ARN. No se añaden permisos de IAM ni de push al
deployer o al runtime.

Los attachments no son exclusivos: no se eliminan asociaciones desconocidas.
Por ello el inventario debe confirmar que no hay permisos adicionales que
contradigan el alcance. Terraform no puede certificar permisos efectivos de
objetos no inventariados ni de SCPs, boundaries o policies externas.

Variables GitHub esperadas, sin modificar workflows:

```text
AWS_REGION=us-east-1
AWS_PUBLISH_ROLE_ARN=arn:aws:iam::850252650610:role/GitHubActionsRaceRestApiPublisher
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::850252650610:role/GitHubActionsRaceRestApiDeployer
PRODUCTION_INSTANCE_ID=i-08806bbce0d653238
PRODUCTION_KEYCLOAK_URL=https://auth.sebaslacabra.lat
```

## Estado, protección y riesgos de operación

- `prevent_destroy` protege ECR, OIDC, policies, roles, attachments, profile,
  EC2 y EIP mientras sus bloques permanezcan en la configuración. No es una
  política AWS ni protege al borrar el bloque completo. La EC2 además tiene
  termination protection, que tampoco sustituye backups.
- Los tres repositorios ECR usan AES-256, tags inmutables y escaneo al publicar.
- El proveedor OIDC es global para la cuenta y podría ser compartido por otros
  repositorios. Verificar sus audiences y usos antes de reconciliarlo; conservar
  cualquier audience adicional legítima. No cambiar su URL ni eliminarlo.
- El estado de producción se almacena cifrado y versionado en el bucket S3
  `race-restapi-terraform-state-850252650610-us-east-1`, con bloqueo nativo por
  archivo. El módulo `bootstrap/` crea el bucket primero con estado local y luego
  migra su propio estado a `bootstrap/terraform.tfstate`; producción usa
  `production/terraform.tfstate`. No se usa DynamoDB porque su mecanismo de lock
  para este backend está deprecado.
- `.terraform/`, tfstate, tfvars, planes convencionales y PEM están ignorados;
  cada `.terraform.lock.hcl` se versiona. No escribir planes o exportaciones con
  nombres arbitrarios fuera de estos patrones ni añadirlos con `git add -f`.
- EC2, EBS y IPv4 pública generan cargos; no se presupone gratuidad. Una sola AZ
  y una sola instancia son un punto único de fallo. Verificar cuotas/capacidad
  y medir memoria/disco al ejecutar PostgreSQL, Keycloak y aplicación juntos.
- El root EBS retenido seguirá generando cargos tras terminar la EC2 y no se
  reanexa automáticamente a otra instancia. **Decision pending**: backups de
  ambas bases, snapshots, restauración probada, retención y monitoreo. Una futura
  sustitución requiere copia/restauración de datos y un plan de corte revisado.
- **Decision pending**: estrategia de actualizaciones de AMI y CIDR definitivo
  si se conecta esta VPC a otras redes. SSM requiere EIP/ruta y conectividad
  saliente; el agente puede tardar en registrarse tras asociar la IP.

## DNS y aplicación

Los registros manuales de Spaceship apuntan `app.sebaslacabra.lat` y
`auth.sebaslacabra.lat` a la EIP. Terraform no administra ese proveedor DNS.
No publicar AAAA porque esta configuración no tiene IPv6.

El despliegue está definido en `infrastructure/deployment`: solo Caddy publica
80/443, obtiene TLS automáticamente y enruta hacia la red privada de Compose.
Las imágenes usan tags inmutables por commit y las contraseñas se leen desde
Parameter Store. Ver su README para el flujo, rollback y límites operativos.

## Estado aplicado y validación (2026-09-08)

- Terraform CLI `1.14.8` y proveedor `hashicorp/aws 6.63.0` fijado en el lockfile.
- Estado remoto cifrado y bloqueado en S3; cuenta y región restringidas por el
  provider.
- EC2, EIP, red, ECR, OIDC, roles y asociaciones aplicados sin destrucciones.
- El cambio de despliegue creó seis recursos, actualizó dos policies ECR y no
  reemplazó ningún recurso.
- El plan posterior al apply informó `No changes`.
- Los tres parámetros de producción existen como `SecureString`; sus valores no
  se mostraron. Una orden SSM confirmó que la EC2 puede leer exactamente tres.
- El environment GitHub `production` acepta solamente ramas protegidas.
- `terraform fmt -check -recursive`, `terraform validate`, validación del Compose,
  sintaxis Bash/JSON/YAML, Prettier y `git diff --check`: correctos.
- La compilación local de la imagen Keycloak requiere Docker Desktop; CI ejecuta
  esa construcción antes de publicar y desplegar.

## Referencias oficiales

- [Importación declarativa de Terraform](https://developer.hashicorp.com/terraform/language/import)
- [EC2 en el proveedor AWS](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)
- [OIDC y thumbprints de GitHub](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider)
- [Amazon Linux 2023 y selección de AMI](https://docs.aws.amazon.com/linux/al2023/ug/ec2.html)
