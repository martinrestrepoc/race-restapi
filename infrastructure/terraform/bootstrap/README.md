# Terraform state bootstrap

This separate root module creates the private S3 bucket used by the production
Terraform backend. It starts with local state because an S3 backend cannot use a
bucket before that bucket exists. Immediately after creation, migrate this small
bootstrap state into the same bucket under a different object key.

The bucket has versioning, Amazon S3-managed encryption, ownership enforcement,
complete public-access blocking, a TLS-only bucket policy and deletion guards.
It uses native S3 state locking; no DynamoDB table is required.

Do not place AWS access keys in this directory. Authenticate with a temporary AWS
CLI session and first verify that it belongs to account `850252650610`.

## Initial creation (completed)

The production state bucket was created and the bootstrap state was migrated to
it during the initial infrastructure rollout. The commands below document that
one-time procedure for recovery or recreation; do not repeat them against the
existing bucket as a routine deployment step.

From the repository root:

```bash
aws sts get-caller-identity --query Account --output text
terraform -chdir=infrastructure/terraform/bootstrap init -input=false
terraform -chdir=infrastructure/terraform/bootstrap plan -input=false -out=bootstrap.tfplan
terraform -chdir=infrastructure/terraform/bootstrap show -no-color bootstrap.tfplan
terraform -chdir=infrastructure/terraform/bootstrap apply bootstrap.tfplan
```

The plan must contain only the six expected S3 resources and no deletion. After
reviewing and applying it, migrate the bootstrap state:

```bash
cp infrastructure/terraform/bootstrap/backend.tf.after-bootstrap.example \
  infrastructure/terraform/bootstrap/backend.tf
terraform -chdir=infrastructure/terraform/bootstrap init -migrate-state
```

Answer `yes` only when Terraform asks to copy the existing local state to S3.
Then verify that a new plan reports no changes before removing the ignored local
`terraform.tfstate` and its backup.

## Production initialization (completed)

After the bucket and state migration were verified, the production module was
initialized, its existing IAM/ECR resources were imported, and the reviewed plan
was applied. The following is now the normal read-only review flow for subsequent
changes:

```bash
terraform -chdir=infrastructure/terraform init -input=false
terraform -chdir=infrastructure/terraform fmt -check -recursive
terraform -chdir=infrastructure/terraform validate
terraform -chdir=infrastructure/terraform plan -input=false -out=review.tfplan
terraform -chdir=infrastructure/terraform show -no-color review.tfplan
```

Do not apply a later plan until every difference has been reviewed. Stop if it
proposes an unexplained deletion, replacement, IAM expansion, or ECR recreation.
