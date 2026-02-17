resource "aws_secretsmanager_secret" "webhook" {
  name                    = "${local.name_prefix}/webhook-hmac-key"
  description             = "HMAC signing key for webhook signature validation"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-webhook-secret"
  }
}

resource "aws_secretsmanager_secret_rotation" "webhook" {
  secret_id           = aws_secretsmanager_secret.webhook.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

resource "aws_secretsmanager_secret" "servicenow" {
  name                    = "${local.name_prefix}/servicenow-credentials"
  description             = "ServiceNow API credentials"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-servicenow-secret"
  }
}

resource "aws_secretsmanager_secret" "pagerduty" {
  name                    = "${local.name_prefix}/pagerduty-api-key"
  description             = "PagerDuty API key"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-pagerduty-secret"
  }
}

resource "aws_secretsmanager_secret" "slack" {
  name                    = "${local.name_prefix}/slack-webhook-url"
  description             = "Slack webhook URL for notifications"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-slack-secret"
  }
}

resource "aws_secretsmanager_secret" "mim" {
  name                    = "${local.name_prefix}/mim-bridge-credentials"
  description             = "MIM bridge API credentials"
  recovery_window_in_days = 7

  tags = {
    Name = "${local.name_prefix}-mim-secret"
  }
}

data "aws_iam_policy_document" "rotation_lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "secret_rotation" {
  name               = "${local.name_prefix}-secret-rotation"
  assume_role_policy = data.aws_iam_policy_document.rotation_lambda_assume.json
}

resource "aws_iam_role_policy" "secret_rotation" {
  name = "${local.name_prefix}-secret-rotation-policy"
  role = aws_iam_role.secret_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
        ]
        Resource = aws_secretsmanager_secret.webhook.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${local.account_id}:*"
      }
    ]
  })
}

resource "aws_lambda_function" "secret_rotation" {
  function_name = "${local.name_prefix}-secret-rotation"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.secret_rotation.arn
  timeout       = 30
  memory_size   = 128

  filename         = data.archive_file.rotation_lambda.output_path
  source_code_hash = data.archive_file.rotation_lambda.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Name = "${local.name_prefix}-secret-rotation"
  }
}

data "archive_file" "rotation_lambda" {
  type        = "zip"
  output_path = "${path.module}/lambda/rotation.zip"

  source {
    content  = <<-EOF
      const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, UpdateSecretVersionStageCommand } = require('@aws-sdk/client-secrets-manager');
      const crypto = require('crypto');
      const client = new SecretsManagerClient({});

      exports.handler = async (event) => {
        const { SecretId, ClientRequestToken, Step } = event;
        switch (Step) {
          case 'createSecret':
            const newKey = crypto.randomBytes(32).toString('hex');
            await client.send(new PutSecretValueCommand({
              SecretId,
              ClientRequestToken,
              SecretString: JSON.stringify({ hmacKey: newKey }),
              VersionStages: ['AWSPENDING'],
            }));
            break;
          case 'setSecret':
          case 'testSecret':
            break;
          case 'finishSecret':
            const metadata = await client.send(new GetSecretValueCommand({ SecretId, VersionStage: 'AWSCURRENT' }));
            await client.send(new UpdateSecretVersionStageCommand({
              SecretId,
              VersionStage: 'AWSCURRENT',
              MoveToVersionId: ClientRequestToken,
              RemoveFromVersionId: metadata.VersionId,
            }));
            break;
        }
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_lambda_permission" "secret_rotation" {
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}
