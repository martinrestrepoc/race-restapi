data "aws_ec2_instance_type_offerings" "runtime" {
  location_type = "availability-zone"
  filter {
    name   = "instance-type"
    values = ["c7i-flex.large"]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "zone-type"
    values = ["availability-zone"]
  }
}

locals {
  runtime_zones = sort(tolist(setintersection(
    data.aws_ec2_instance_type_offerings.runtime.locations,
    data.aws_availability_zones.available.names,
  )))
}

resource "aws_vpc" "production" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = local.name_prefix }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.production.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 0)
  availability_zone       = try(local.runtime_zones[0], null)
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name_prefix}-public" }

  lifecycle {
    precondition {
      condition     = length(local.runtime_zones) > 0
      error_message = "No available standard AZ in us-east-1 offers c7i-flex.large."
    }
  }
}

resource "aws_internet_gateway" "production" {
  vpc_id = aws_vpc.production.id
  tags   = { Name = local.name_prefix }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.production.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.production.id
  }
  tags = { Name = "${local.name_prefix}-public" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "runtime" {
  name        = "${local.name_prefix}-web"
  description = "Public HTTP/HTTPS only; administration uses SSM"
  vpc_id      = aws_vpc.production.id

  # Inline rules deliberately manage the complete ingress set for this SG.
  ingress {
    description = "HTTP and ACME certificate validation"
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    description = "Outbound access for SSM, ECR layers, OS updates and container downloads"
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${local.name_prefix}-web" }
}
