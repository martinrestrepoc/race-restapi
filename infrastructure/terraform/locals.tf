locals {
  name_prefix = "race-restapi-production"
  common_tags = {
    Project     = "race-restapi"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
  repository_names = toset(["race-restapi-backend", "race-restapi-frontend", "race-restapi-keycloak"])
  repository_arns  = [for name in sort(tolist(local.repository_names)) : "arn:aws:ecr:us-east-1:850252650610:repository/${name}"]

  # GitHub's OIDC subject prefix includes immutable owner and repository IDs.
  # Keep the branch and Environment suffixes exact for each role.
  github_main_subject                   = "repo:martinrestrepoc@195827900/race-restapi@1310204506:ref:refs/heads/main"
  github_production_environment_subject = "repo:martinrestrepoc@195827900/race-restapi@1310204506:environment:production"
}
