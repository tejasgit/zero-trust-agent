locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_lambda_function" "webhook_receiver" {
  function_name = "${local.name_prefix}-webhook-receiver"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = var.lambda_role_arn
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.webhook_receiver.output_path
  source_code_hash = data.archive_file.webhook_receiver.output_base64sha256

  vpc_config {
    subnet_ids         = var.private_subnets
    security_group_ids = [var.security_group_id]
  }

  environment {
    variables = {
      ENVIRONMENT             = var.environment
      INCIDENTS_TABLE         = var.incidents_table_name
      AUDIT_TABLE             = var.audit_table_name
      SUPPRESSION_TABLE       = var.suppression_table_name
      WEBHOOK_SECRET_ARN      = var.webhook_secret_arn
      EVENTBRIDGE_BUS_ARN     = var.eventbridge_bus_arn
      REPLAY_WINDOW_SECONDS   = "300"
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "${local.name_prefix}-webhook-receiver"
  }
}

data "archive_file" "webhook_receiver" {
  type        = "zip"
  output_path = "${path.module}/lambda/webhook-receiver.zip"

  source {
    content  = <<-EOF
      const { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
      const crypto = require('crypto');

      const dynamo = new DynamoDBClient({});
      const secrets = new SecretsManagerClient({});
      const events = new EventBridgeClient({});

      let cachedHmacKey = null;

      async function getHmacKey() {
        if (cachedHmacKey) return cachedHmacKey;
        const result = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.WEBHOOK_SECRET_ARN }));
        const parsed = JSON.parse(result.SecretString);
        cachedHmacKey = parsed.hmacKey;
        return cachedHmacKey;
      }

      function verifySignature(body, signature, timestamp, key) {
        const now = Math.floor(Date.now() / 1000);
        const ts = parseInt(timestamp, 10);
        if (Math.abs(now - ts) > parseInt(process.env.REPLAY_WINDOW_SECONDS)) {
          throw new Error('Timestamp outside replay window');
        }
        const expected = crypto.createHmac('sha256', key).update(timestamp + '.' + body).digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          throw new Error('Invalid HMAC signature');
        }
      }

      async function checkSuppression(source, title) {
        const result = await dynamo.send(new ScanCommand({ TableName: process.env.SUPPRESSION_TABLE }));
        const rules = result.Items || [];
        const now = new Date().toISOString();
        for (const rule of rules) {
          if (rule.enabled?.BOOL === false) continue;
          if (rule.expiresAt?.S && rule.expiresAt.S < now) continue;
          const sourcePattern = rule.sourcePattern?.S;
          const titlePattern = rule.titlePattern?.S;
          if (sourcePattern && new RegExp(sourcePattern, 'i').test(source)) return true;
          if (titlePattern && new RegExp(titlePattern, 'i').test(title)) return true;
        }
        return false;
      }

      async function checkIdempotency(idempotencyKey) {
        if (!idempotencyKey) return false;
        try {
          await dynamo.send(new PutItemCommand({
            TableName: process.env.INCIDENTS_TABLE,
            Item: {
              id: { S: 'dedup#' + idempotencyKey },
              ttl: { N: String(Math.floor(Date.now() / 1000) + 86400) },
              createdAt: { S: new Date().toISOString() },
            },
            ConditionExpression: 'attribute_not_exists(id)',
          }));
          return false;
        } catch (err) {
          if (err.name === 'ConditionalCheckFailedException') return true;
          throw err;
        }
      }

      exports.handler = async (event) => {
        try {
          const body = event.body;
          const signature = event.headers['x-webhook-signature'];
          const timestamp = event.headers['x-webhook-timestamp'];

          if (!signature || !timestamp) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Missing signature headers' }) };
          }

          const hmacKey = await getHmacKey();
          verifySignature(body, signature, timestamp, hmacKey);

          const payload = JSON.parse(body);
          const idempotencyKey = payload.idempotencyKey || null;

          if (idempotencyKey) {
            const isDuplicate = await checkIdempotency(idempotencyKey);
            if (isDuplicate) {
              return { statusCode: 200, body: JSON.stringify({ status: 'duplicate', idempotencyKey }) };
            }
          }

          const suppressed = await checkSuppression(payload.source || '', payload.title || '');
          if (suppressed) {
            return { statusCode: 200, body: JSON.stringify({ status: 'suppressed', idempotencyKey }) };
          }

          const incidentId = crypto.randomUUID();
          const now = new Date().toISOString();

          await dynamo.send(new PutItemCommand({
            TableName: process.env.INCIDENTS_TABLE,
            Item: {
              id: { S: incidentId },
              title: { S: payload.title || 'Untitled Alert' },
              source: { S: payload.source || 'unknown' },
              status: { S: 'open' },
              rawPayload: { S: JSON.stringify(payload) },
              createdAt: { S: now },
              ...(idempotencyKey ? { idempotencyKey: { S: idempotencyKey } } : {}),
            },
          }));

          await events.send(new PutEventsCommand({
            Entries: [{
              Source: 'triage-agent.ingestion',
              DetailType: 'IncidentCreated',
              Detail: JSON.stringify({ incidentId, source: payload.source, title: payload.title, rawPayload: payload }),
              EventBusName: process.env.EVENTBRIDGE_BUS_ARN,
            }],
          }));

          await dynamo.send(new PutItemCommand({
            TableName: process.env.AUDIT_TABLE,
            Item: {
              id: { S: crypto.randomUUID() },
              incidentId: { S: incidentId },
              action: { S: 'incident_created' },
              actor: { S: 'webhook-receiver' },
              details: { S: JSON.stringify({ source: payload.source, idempotencyKey }) },
              timestamp: { S: now },
              correlationId: { S: idempotencyKey },
            },
          }));

          return { statusCode: 201, body: JSON.stringify({ incidentId, status: 'created' }) };
        } catch (err) {
          console.error('Webhook processing error:', err);
          if (err.message.includes('HMAC') || err.message.includes('replay')) {
            return { statusCode: 401, body: JSON.stringify({ error: err.message }) };
          }
          return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
        }
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.webhook_receiver.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "webhook" {
  api_id                 = var.api_gateway_id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.webhook_receiver.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "webhook_post" {
  api_id    = var.api_gateway_id
  route_key = "POST /webhooks/{source}"
  target    = "integrations/${aws_apigatewayv2_integration.webhook.id}"
  # Webhooks use HMAC signature validation (not OKTA JWT)
  # OKTA JWT authorizer is applied to dashboard API routes (rules/incidents CRUD)
}

output "lambda_function_name" {
  value = aws_lambda_function.webhook_receiver.function_name
}
