terraform {
  backend "s3" {
    bucket       = "race-restapi-terraform-state-850252650610-us-east-1"
    key          = "bootstrap/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
