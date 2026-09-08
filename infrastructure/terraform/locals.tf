locals {
  name_prefix = "race-restapi-production"
  common_tags = {
    Project     = "race-restapi"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
  repository_names = toset(["race-restapi-backend", "race-restapi-frontend"])
  repository_arns  = [for name in sort(tolist(local.repository_names)) : "arn:aws:ecr:us-east-1:850252650610:repository/${name}"]

  # GitHub's OIDC subject prefix includes immutable owner and repository IDs.
  # Keep the branch suffix exact so only the main branch can publish images.
  github_publish_subject = "repo:martinrestrepoc@195827900/race-restapi@1310204506:ref:refs/heads/main"
}
