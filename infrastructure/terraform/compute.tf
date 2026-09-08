data "aws_key_pair" "production" {
  key_name           = "race-restapi-production"
  include_public_key = false
}

data "aws_ssm_parameter" "al2023" {
  count           = var.ami_id == null ? 1 : 0
  name            = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
  with_decryption = false
}

data "aws_ami" "runtime" {
  owners = ["amazon"]
  filter {
    name   = "image-id"
    values = [var.ami_id != null ? var.ami_id : nonsensitive(data.aws_ssm_parameter.al2023[0].value)]
  }
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

resource "aws_instance" "runtime" {
  ami                     = data.aws_ami.runtime.id
  instance_type           = "c7i-flex.large"
  subnet_id               = aws_subnet.public.id
  vpc_security_group_ids  = [aws_security_group.runtime.id]
  key_name                = data.aws_key_pair.production.key_name
  iam_instance_profile    = aws_iam_instance_profile.runtime.name
  disable_api_termination = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    encrypted             = true
    delete_on_termination = false
    tags                  = merge(local.common_tags, { Name = "${local.name_prefix}-root" })
  }

  # Standard AL2023 includes SSM Agent. It retries connectivity after EIP
  # association; no downloads, secrets, application deployment or PEM required.
  user_data                   = <<-USERDATA
    #!/bin/bash
    set -euo pipefail
    systemctl enable --now amazon-ssm-agent
  USERDATA
  user_data_replace_on_change = true
  tags                        = { Name = local.name_prefix }

  depends_on = [
    aws_route_table_association.public,
    aws_iam_role_policy_attachment.runtime_ecr,
    aws_iam_role_policy_attachment.runtime_ssm,
  ]

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_eip" "runtime" {
  domain = "vpc"
  tags   = { Name = local.name_prefix }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_eip_association" "runtime" {
  instance_id         = aws_instance.runtime.id
  allocation_id       = aws_eip.runtime.id
  allow_reassociation = false
  depends_on          = [aws_internet_gateway.production]
}
