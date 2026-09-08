locals {
  name_prefix = "race-restapi-production"
  common_tags = {
    Project     = "race-restapi"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
  repository_names = toset(["race-restapi-backend", "race-restapi-frontend"])
  repository_arns  = [for name in sort(tolist(local.repository_names)) : "arn:aws:ecr:us-east-1:850252650610:repository/${name}"]
}
