locals {
  name_prefix = "${var.project_name}-${var.environment}"

  action_handlers = {
    servicenow = {
      name       = "servicenow-handler"
      secret_arn = var.servicenow_secret_arn
      detail_type = "ActionRequired"
      filter_action = "create_incident"
    }
    pagerduty = {
      name       = "pagerduty-handler"
      secret_arn = var.pagerduty_secret_arn
      detail_type = "ActionRequired"
      filter_action = "page_oncall"
    }
    mim = {
      name       = "mim-handler"
      secret_arn = var.mim_secret_arn
      detail_type = "ActionRequired"
      filter_action = "trigger_mim"
    }
    slack = {
      name       = "slack-handler"
      secret_arn = var.slack_secret_arn
      detail_type = "ActionRequired"
      filter_action = "notify_slack"
    }
  }
}

resource "aws_lambda_function" "action_handler" {
  for_each = local.action_handlers

  function_name = "${local.name_prefix}-${each.value.name}"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = var.lambda_role_arn
  timeout       = 60
  memory_size   = 256

  filename         = data.archive_file.action_handler[each.key].output_path
  source_code_hash = data.archive_file.action_handler[each.key].output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnets
    security_group_ids = [var.security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      INCIDENTS_TABLE  = var.incidents_table_name
      AUDIT_TABLE      = var.audit_table_name
      SECRET_ARN       = each.value.secret_arn
      ACTION_TYPE      = each.key
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "${local.name_prefix}-${each.value.name}"
  }
}

data "archive_file" "action_handler" {
  for_each = local.action_handlers

  type        = "zip"
  output_path = "${path.module}/lambda/${each.key}-handler.zip"

  source {
    content  = <<-EOF
      const { DynamoDBClient, UpdateItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const https = require('https');
      const crypto = require('crypto');

      const dynamo = new DynamoDBClient({});
      const secrets = new SecretsManagerClient({});

      let cachedCredentials = null;

      async function getCredentials() {
        if (cachedCredentials) return cachedCredentials;
        const result = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }));
        cachedCredentials = JSON.parse(result.SecretString);
        return cachedCredentials;
      }

      async function executeAction(actionType, credentials, detail) {
        switch (actionType) {
          case 'servicenow':
            console.log('Creating ServiceNow incident:', { severity: detail.severity, classification: detail.classification });
            return { integrationId: 'INC' + Date.now(), status: 'created' };
          case 'pagerduty':
            console.log('Paging on-call via PagerDuty:', { target: detail.target, severity: detail.severity });
            return { integrationId: 'PD-' + crypto.randomUUID().substring(0, 8), status: 'paged' };
          case 'mim':
            console.log('Triggering MIM bridge:', { severity: detail.severity });
            return { integrationId: 'MIM-' + Date.now(), status: 'bridge_opened' };
          case 'slack':
            console.log('Sending Slack notification:', { channel: detail.target });
            return { integrationId: 'SLACK-' + Date.now(), status: 'notified' };
          default:
            throw new Error('Unknown action type: ' + actionType);
        }
      }

      exports.handler = async (event) => {
        const detail = event.detail || JSON.parse(event.body || '{}');
        const incidentId = detail.incidentId;
        const correlationId = detail.correlationId || crypto.randomUUID();
        const actionType = process.env.ACTION_TYPE;

        try {
          if (detail.gated) {
            await dynamo.send(new PutItemCommand({
              TableName: process.env.AUDIT_TABLE,
              Item: {
                id: { S: crypto.randomUUID() },
                incidentId: { S: incidentId },
                action: { S: actionType + '_gated' },
                actor: { S: actionType + '-handler' },
                details: { S: JSON.stringify({ reason: detail.reason || 'Gated by policy', requiresApproval: detail.requiresApproval }) },
                timestamp: { S: new Date().toISOString() },
                correlationId: { S: correlationId },
              },
            }));
            return { statusCode: 200, body: JSON.stringify({ status: 'gated', incidentId }) };
          }

          const credentials = await getCredentials();
          const result = await executeAction(actionType, credentials, detail);

          const integrationField = {
            servicenow: 'snowIncidentId',
            pagerduty: 'pdIncidentId',
            mim: 'mimBridgeId',
            slack: 'slackThreadId',
          }[actionType];

          if (integrationField) {
            await dynamo.send(new UpdateItemCommand({
              TableName: process.env.INCIDENTS_TABLE,
              Key: { id: { S: incidentId } },
              UpdateExpression: 'SET #field = :val',
              ExpressionAttributeNames: { '#field': integrationField },
              ExpressionAttributeValues: { ':val': { S: result.integrationId } },
            }));
          }

          await dynamo.send(new PutItemCommand({
            TableName: process.env.AUDIT_TABLE,
            Item: {
              id: { S: crypto.randomUUID() },
              incidentId: { S: incidentId },
              action: { S: actionType + '_executed' },
              actor: { S: actionType + '-handler' },
              details: { S: JSON.stringify(result) },
              timestamp: { S: new Date().toISOString() },
              correlationId: { S: correlationId },
            },
          }));

          return { statusCode: 200, body: JSON.stringify({ status: 'executed', ...result }) };
        } catch (err) {
          console.error(actionType + ' handler error:', err);

          await dynamo.send(new PutItemCommand({
            TableName: process.env.AUDIT_TABLE,
            Item: {
              id: { S: crypto.randomUUID() },
              incidentId: { S: incidentId },
              action: { S: actionType + '_failed' },
              actor: { S: actionType + '-handler' },
              details: { S: JSON.stringify({ error: err.message }) },
              timestamp: { S: new Date().toISOString() },
              correlationId: { S: correlationId },
            },
          }));

          throw err;
        }
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_cloudwatch_event_rule" "action_required" {
  for_each = local.action_handlers

  name           = "${local.name_prefix}-${each.key}-trigger"
  event_bus_name = var.eventbridge_bus_name

  event_pattern = jsonencode({
    source      = ["triage-agent.triage"]
    detail-type = [each.value.detail_type]
    detail = {
      action = [each.value.filter_action]
    }
  })

  tags = {
    Name = "${local.name_prefix}-${each.key}-trigger"
  }
}

resource "aws_cloudwatch_event_target" "action_lambda" {
  for_each = local.action_handlers

  rule           = aws_cloudwatch_event_rule.action_required[each.key].name
  event_bus_name = var.eventbridge_bus_name
  arn            = aws_lambda_function.action_handler[each.key].arn
}

resource "aws_lambda_permission" "eventbridge_action" {
  for_each = local.action_handlers

  statement_id  = "AllowEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.action_handler[each.key].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.action_required[each.key].arn
}

output "lambda_function_names" {
  value = { for k, v in aws_lambda_function.action_handler : k => v.function_name }
}
