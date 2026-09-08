resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  # AWS validates GitHub against trusted CAs. Do not hard-code certificate hashes.
  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "publisher_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_main_subject]
    }
  }
}

data "aws_iam_policy_document" "publisher" {
  statement {
    sid       = "GetEcrAuthorizationToken"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "PublishRaceImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
    ]
    resources = local.repository_arns
  }
}

resource "aws_iam_policy" "publisher" {
  name   = "RaceRestApiEcrPublisher"
  policy = data.aws_iam_policy_document.publisher.json

  lifecycle {
    prevent_destroy = true
    # Existing description is immutable in AWS; do not replace to normalize it.
    ignore_changes = [description]
  }
}

resource "aws_iam_role" "publisher" {
  name               = "GitHubActionsRaceRestApiPublisher"
  description        = "Allows the race-restapi main branch to publish container images to Amazon ECR."
  assume_role_policy = data.aws_iam_policy_document.publisher_trust.json

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy_attachment" "publisher" {
  role       = aws_iam_role.publisher.name
  policy_arn = aws_iam_policy.publisher.arn

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "runtime_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "puller" {
  statement {
    sid       = "GetEcrAuthorizationToken"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "PullRaceRestApiImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = local.repository_arns
  }
}

resource "aws_iam_policy" "puller" {
  name   = "RaceRestApiEcrPuller"
  policy = data.aws_iam_policy_document.puller.json

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [description]
  }
}

resource "aws_iam_role" "runtime" {
  name               = "RaceRestApiRuntimeRole"
  description        = "Allows EC2 instances to call AWS services on your behalf."
  assume_role_policy = data.aws_iam_policy_document.runtime_trust.json

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy_attachment" "runtime_ecr" {
  role       = aws_iam_role.runtime.name
  policy_arn = aws_iam_policy.puller.arn

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy_attachment" "runtime_ssm" {
  role       = aws_iam_role.runtime.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "runtime_parameters" {
  statement {
    sid = "ReadProductionParameters"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:us-east-1:850252650610:parameter/race-restapi/production/*"]
  }
}

resource "aws_iam_policy" "runtime_parameters" {
  name        = "RaceRestApiProductionParameterReader"
  description = "Allows the production EC2 instance to read only its encrypted runtime configuration."
  policy      = data.aws_iam_policy_document.runtime_parameters.json

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy_attachment" "runtime_parameters" {
  role       = aws_iam_role.runtime.name
  policy_arn = aws_iam_policy.runtime_parameters.arn

  lifecycle {
    prevent_destroy = true
  }
}

data "aws_iam_policy_document" "deployer_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_production_environment_subject]
    }
  }
}

data "aws_iam_policy_document" "deployer" {
  statement {
    sid       = "VerifyReleaseImages"
    actions   = ["ecr:BatchGetImage"]
    resources = local.repository_arns
  }
  statement {
    sid     = "RunProductionDeployment"
    actions = ["ssm:SendCommand"]
    resources = [
      aws_instance.runtime.arn,
      "arn:aws:ssm:us-east-1::document/AWS-RunShellScript",
    ]
  }
  statement {
    sid = "ReadDeploymentStatus"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "deployer" {
  name        = "RaceRestApiProductionDeployer"
  description = "Allows the race-restapi main branch to deploy immutable images through SSM."
  policy      = data.aws_iam_policy_document.deployer.json

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role" "deployer" {
  name               = "GitHubActionsRaceRestApiDeployer"
  description        = "Allows the race-restapi main branch to deploy the production EC2 instance."
  assume_role_policy = data.aws_iam_policy_document.deployer_trust.json

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_role_policy_attachment" "deployer" {
  role       = aws_iam_role.deployer.name
  policy_arn = aws_iam_policy.deployer.arn

  lifecycle {
    prevent_destroy = true
  }
}

# A role and an instance profile are distinct AWS objects. Check whether the
# console already created a same-named profile and import it if present.
resource "aws_iam_instance_profile" "runtime" {
  name = "RaceRestApiRuntimeRole"
  role = aws_iam_role.runtime.name

  lifecycle {
    prevent_destroy = true
  }
}
