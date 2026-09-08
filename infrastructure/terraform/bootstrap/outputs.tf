output "state_bucket_name" {
  description = "S3 bucket used by the production and bootstrap Terraform states."
  value       = aws_s3_bucket.terraform_state.id
}

output "production_state_key" {
  description = "Object key configured by the production root module."
  value       = "production/terraform.tfstate"
}
