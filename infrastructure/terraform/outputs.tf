output "instance_id" {
  description = "EC2 ID for inventory and SSM Session Manager."
  value       = aws_instance.runtime.id
}

output "elastic_ip" {
  description = "Public IPv4 for the two manual Spaceship A records."
  value       = aws_eip.runtime.public_ip
  depends_on  = [aws_eip_association.runtime]
}

output "ecr_repository_uris" {
  description = "Immutable-tag repositories used by the existing publisher workflow."
  value       = { for name, repository in aws_ecr_repository.images : name => repository.repository_url }
}

output "ami_id" {
  description = "Resolved AL2023 image; pin this in terraform.tfvars before deployment."
  value       = data.aws_ami.runtime.id
}

output "publisher_role_arn" {
  description = "GitHub repository variable AWS_PUBLISH_ROLE_ARN."
  value       = aws_iam_role.publisher.arn
}

output "deployer_role_arn" {
  description = "GitHub repository variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deployer.arn
}

output "production_parameter_names" {
  description = "Encrypted SSM parameters that must exist before the first deployment."
  value = [
    "/race-restapi/production/POSTGRES_PASSWORD",
    "/race-restapi/production/KEYCLOAK_DB_PASSWORD",
    "/race-restapi/production/KEYCLOAK_ADMIN_PASSWORD",
  ]
}

output "manual_dns_records" {
  description = "Documentation only: Terraform does not manage Spaceship DNS or TLS."
  value = {
    "app.sebaslacabra.lat"  = { type = "A", value = aws_eip.runtime.public_ip }
    "auth.sebaslacabra.lat" = { type = "A", value = aws_eip.runtime.public_ip }
  }
}
