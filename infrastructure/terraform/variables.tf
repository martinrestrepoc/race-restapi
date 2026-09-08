variable "ami_id" {
  description = "Pinned Amazon Linux 2023 x86_64 AMI in us-east-1. Null discovers the current AWS AMI; pin before production deployment."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = var.ami_id == null ? true : can(regex("^ami-[0-9a-f]{17}$", var.ami_id))
    error_message = "ami_id must be null or a valid AMI ID."
  }
}

variable "vpc_cidr" {
  description = "CIDR for the new dedicated VPC; check for overlap before connecting other networks."
  type        = string
  default     = "10.42.0.0/16"
  nullable    = false

  validation {
    condition     = can(cidrsubnet(var.vpc_cidr, 8, 0)) && can(regex("/16$", var.vpc_cidr)) && can(cidrnetmask(var.vpc_cidr))
    error_message = "Use an IPv4 /16 CIDR; the public subnet will be its first /24."
  }
}
