# Declarative only: init/validate do not import. A future plan previews adoption;
# applying that plan would import AND create/update resources. Do not apply yet.
import {
  to = aws_ecr_repository.images["race-restapi-backend"]
  id = "race-restapi-backend"
}

import {
  to = aws_ecr_repository.images["race-restapi-frontend"]
  id = "race-restapi-frontend"
}

import {
  to = aws_iam_openid_connect_provider.github
  id = "arn:aws:iam::850252650610:oidc-provider/token.actions.githubusercontent.com"
}

import {
  to = aws_iam_policy.publisher
  id = "arn:aws:iam::850252650610:policy/RaceRestApiEcrPublisher"
}

import {
  to = aws_iam_role.publisher
  id = "GitHubActionsRaceRestApiPublisher"
}

import {
  to = aws_iam_role_policy_attachment.publisher
  id = "GitHubActionsRaceRestApiPublisher/arn:aws:iam::850252650610:policy/RaceRestApiEcrPublisher"
}

import {
  to = aws_iam_policy.puller
  id = "arn:aws:iam::850252650610:policy/RaceRestApiEcrPuller"
}

import {
  to = aws_iam_role.runtime
  id = "RaceRestApiRuntimeRole"
}

import {
  to = aws_iam_instance_profile.runtime
  id = "RaceRestApiRuntimeRole"
}

import {
  to = aws_iam_role_policy_attachment.runtime_ecr
  id = "RaceRestApiRuntimeRole/arn:aws:iam::850252650610:policy/RaceRestApiEcrPuller"
}

import {
  to = aws_iam_role_policy_attachment.runtime_ssm
  id = "RaceRestApiRuntimeRole/arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
