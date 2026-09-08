# AWS production infrastructure

Configuración revisable para `850252650610`, exclusivamente en `us-east-1`.
No se ha desplegado infraestructura ni importado estado. Los recursos manuales
se declaran como recursos administrados y `imports.tf` contiene su adopción.

## Estructura y alcance

| Archivo | Responsabilidad |
| --- | --- |
| `versions.tf`, `.terraform.lock.hcl` | Versiones, proveedor AWS y bloqueo de cuenta |
| `backend.tf` | Estado remoto cifrado en S3 con bloqueo nativo |
| `bootstrap/` | Módulo separado que crea y protege el bucket de estado |
| `variables.tf`, `locals.tf` | AMI, CIDR y tags de producción |
| `ecr.tf` | Dos repositorios existentes, tags inmutables y sin borrado forzado |
| `iam.tf` | OIDC, dos policies, dos roles, tres attachments y un instance profile |
| `network.tf` | VPC dedicada, subnet pública, Internet Gateway, rutas y security group |
| `compute.tf` | Consulta del key pair, AMI oficial, EC2 y Elastic IP |
| `imports.tf` | Once importaciones declarativas de recursos existentes |
| `outputs.tf` | ID de instancia, IP, URIs ECR, AMI, rol publisher y registros DNS manuales |

Se crea una VPC dedicada `10.42.0.0/16` y su primera subnet `/24`, sin asumir que
existe una VPC por defecto ni alterar redes existentes. La AZ se selecciona entre
las habilitadas que ofrecen `c7i-flex.large`; la oferta no garantiza capacidad.
La subnet no asigna IP pública automática: la EC2 utiliza únicamente la EIP.
No se crean NAT Gateway, balanceador, RDS ni recursos de DNS.

La EC2 usa AL2023 **estándar**, de Amazon, x86_64, `c7i-flex.large`, disco raíz
gp3 de 30 GiB cifrado con la clave EBS predeterminada, IMDSv2 obligatorio y hop
limit 2. El volumen se conserva si posteriormente se termina la instancia.
El arranque únicamente habilita SSM Agent, incluido en la AMI estándar.
Docker, Compose y la aplicación no se instalan con este cambio.

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
aws ecr describe-repositories --region us-east-1 --repository-names race-restapi-backend race-restapi-frontend
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

## Importación sin recreación

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

Procedimiento propuesto (no ejecutado contra AWS):

1. Repetir el inventario anterior antes de adoptar para detectar cambios desde la
   revisión del 7 de septiembre de 2026. En esa revisión se confirmaron paths `/`,
   sesiones de 3600 segundos, ausencia de boundaries y policies inline, los tres
   attachments esperados y el instance profile correcto.
2. Comparar el plan con el inventario. Las policies administradas coinciden en
   permisos con AWS. El trust publisher existente usa `StringLike` con el subject
   de `main` duplicado; Terraform propone normalizarlo a un solo `StringEquals`.
   No aceptar otros cambios IAM inadvertidos.
3. Copiar el ejemplo y preparar únicamente un plan de revisión:

   ```bash
   cp infrastructure/terraform/terraform.tfvars.example infrastructure/terraform/terraform.tfvars
   terraform -chdir=infrastructure/terraform init -input=false
   terraform -chdir=infrastructure/terraform fmt -check -recursive
   terraform -chdir=infrastructure/terraform validate
   terraform -chdir=infrastructure/terraform plan -input=false -out=review.tfplan
   terraform -chdir=infrastructure/terraform show -no-color review.tfplan
   ```

4. Fijar `ami_id` al ID oficial resuelto en el plan y volver a planificar. No usar
   un ID inventado. Esto evita que nuevas publicaciones de AL2023 propongan
   sustituir la instancia. `prevent_destroy` bloquearía esa sustitución.
5. Esperar once imports, nueve recursos nuevos y **cero
   destrucciones/reemplazos**. El plan puede mostrar updates de
   tags o de IAM; revisarlos uno a uno. No se promete un plan sin diferencias
   sobre objetos que no se han inventariado. Detenerse ante cualquier replacement.
6. Entregar el plan y pedir autorización para la siguiente fase. **No ejecutar
   `apply`, `terraform import`, `destroy` ni comandos de borrado en esta fase.**

`init`, `fmt` y `validate` no importan. Un plan con bloques `import` solo muestra
la adopción propuesta, no la persiste en el estado. Un futuro `apply` de ese plan
importaría **y también crearía/actualizaría** lo propuesto; no es una operación de
solo importación. Los bloques se pueden conservar después de adoptar.

## IAM y compatibilidad con publicación

El trust del publisher exige audience `sts.amazonaws.com` y el subject exacto
`repo:martinrestrepoc@195827900/race-restapi@1310204506:ref:refs/heads/main`,
incluyendo los IDs inmutables que GitHub usa en el prefijo del repositorio. Esto
es coherente con el remoto y el workflow actual sin GitHub Environment. Cambiar
de repositorio, rama o usar
un Environment requiere revisar el subject. No se permiten forks/PRs ni `repo:*`.

El publisher puede autenticar ECR y leer/publicar únicamente en los dos
repositorios. `BatchGetImage` cubre la comprobación de tags ya publicados.
El runtime solo puede autenticar/descargar esas imágenes y usar la policy SSM
existente. `ecr:GetAuthorizationToken` requiere `Resource="*"`; las operaciones
de repositorio se restringen a dos ARN. No se añaden permisos de EC2, IAM o
despliegue al publisher ni de push al runtime.

Los attachments no son exclusivos: no se eliminan asociaciones desconocidas.
Por ello el inventario debe confirmar que no hay permisos adicionales que
contradigan el alcance. Terraform no puede certificar permisos efectivos de
objetos no inventariados ni de SCPs, boundaries o policies externas.

Variables GitHub esperadas, sin modificar workflows:

```text
AWS_REGION=us-east-1
AWS_PUBLISH_ROLE_ARN=arn:aws:iam::850252650610:role/GitHubActionsRaceRestApiPublisher
PRODUCTION_KEYCLOAK_URL=https://auth.sebaslacabra.lat
```

## Estado, protección y riesgos de operación

- `prevent_destroy` protege ECR, OIDC, policies, roles, attachments, profile,
  EC2 y EIP mientras sus bloques permanezcan en la configuración. No es una
  política AWS ni protege al borrar el bloque completo. La EC2 además tiene
  termination protection, que tampoco sustituye backups.
- Los dos repositorios ECR existentes usan AES-256 y tags inmutables, pero el
  inventario encontró `scanOnPush=false`. Terraform conserva el cifrado y propone
  activar el escaneo al publicar sin reemplazar los repositorios. Los tags comunes
  se agregarán a los recursos importados; revisar esas actualizaciones.
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

## DNS y aplicación: siguiente fase

Después de un despliegue autorizado, crear manualmente en Spaceship registros
`A` para `app.sebaslacabra.lat` y `auth.sebaslacabra.lat` con `elastic_ip`.
No se crean registros ni se modifica Spaceship en Terraform. No publicar AAAA
porque esta configuración no tiene IPv6.

Abrir 443 no instala un certificado ni un servidor HTTPS. **Decision pending**:
proxy inverso/TLS, certificados y renovación, instalación Docker/Compose,
despliegue por tag inmutable/digest y gestión de secretos en el host.
Configurar Keycloak para `https://auth.sebaslacabra.lat`, su proxy, issuer,
redirects y web origins de `https://app.sebaslacabra.lat`.

El Compose actual compila localmente y publica PostgreSQL, backend y frontend
en puertos del host. No usarlo sin adaptar como despliegue público: en la futura
configuración de producción, esos servicios deben usar redes internas o loopback,
y únicamente el proxy debe publicar 80/443. También se debe preparar la imagen
personalizada de Keycloak y un realm de producción sin usuarios demo.

## Validación de esta entrega (2026-09-07)

- Terraform CLI `1.14.8`, plataforma `darwin_arm64`.
- `init -backend=false -input=false`: correcto; proveedor oficial firmado
  `hashicorp/aws 6.63.0`, fijado en `.terraform.lock.hcl`.
- `fmt -check -recursive`: correcto.
- `validate -no-color`: `Success! The configuration is valid.`
- `git diff --check` de los archivos existentes modificados por esta entrega:
  correcto. El chequeo global detecta un espacio final previo del usuario en
  `.github/workflows/system-e2e.yml:9`; se conserva.
- Exclusiones de `.terraform/`, estado/backups, planes, tfvars y PEM comprobadas;
  el ejemplo y lockfile aparecen como archivos versionables.
- Checksums SHA-256 de los tres workflows iguales antes y después del trabajo.
- AWS CLI `2.36.40` quedó instalado y se realizó inventario de solo lectura con
  una sesión temporal. Se confirmaron cuenta, ECR, OIDC, roles, policies,
  attachments, instance profile y key pair; la sesión root se cerró al terminar.
- El plan bootstrap propone seis creaciones S3, cero cambios y cero destrucciones.
  No se ejecutaron apply, imports ni comandos de eliminación. El plan de producción
  se generará después de crear el bucket y autenticar con una identidad humana
  distinta de root.

La descarga del proveedor y su ejecución para validar requirieron salir del
sandbox local (restricciones de red/inicio del plugin); ambas finalizaron
correctamente. No se ejecutaron pruebas de aplicación: el cambio es de
infraestructura y documentación, sin modificar código de negocio.

## Referencias oficiales

- [Importación declarativa de Terraform](https://developer.hashicorp.com/terraform/language/import)
- [EC2 en el proveedor AWS](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)
- [OIDC y thumbprints de GitHub](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider)
- [Amazon Linux 2023 y selección de AMI](https://docs.aws.amazon.com/linux/al2023/ug/ec2.html)
