terraform {
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region              = "us-east-1"
  allowed_account_ids = ["850252650610"]

  default_tags {
    tags = local.common_tags
  }
}
