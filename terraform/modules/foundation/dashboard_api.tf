resource "aws_lambda_function" "dashboard_api" {
  function_name = "${local.name_prefix}-dashboard-api"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_execution.arn
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.dashboard_api.output_path
  source_code_hash = data.archive_file.dashboard_api.output_base64sha256

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      INCIDENTS_TABLE          = aws_dynamodb_table.incidents.name
      AUDIT_TABLE              = aws_dynamodb_table.audit_logs.name
      ESCALATION_RULES_TABLE   = aws_dynamodb_table.escalation_rules.name
      GATING_RULES_TABLE       = aws_dynamodb_table.gating_rules.name
      SUPPRESSION_RULES_TABLE  = aws_dynamodb_table.suppression_rules.name
      DECISION_MATRIX_TABLE    = aws_dynamodb_table.decision_matrix.name
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = {
    Name = "${local.name_prefix}-dashboard-api"
  }
}

data "archive_file" "dashboard_api" {
  type        = "zip"
  output_path = "${path.module}/lambda/dashboard-api.zip"

  source {
    content  = <<-EOF
      const { DynamoDBClient, ScanCommand, GetItemCommand, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
      const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
      const crypto = require('crypto');

      const dynamo = new DynamoDBClient({});

      const tableMap = {
        'incidents': process.env.INCIDENTS_TABLE,
        'audit': process.env.AUDIT_TABLE,
        'escalation-rules': process.env.ESCALATION_RULES_TABLE,
        'gating-rules': process.env.GATING_RULES_TABLE,
        'suppression-rules': process.env.SUPPRESSION_RULES_TABLE,
        'decision-matrix': process.env.DECISION_MATRIX_TABLE,
      };

      function response(statusCode, body) {
        return {
          statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        };
      }

      exports.handler = async (event) => {
        const method = event.requestContext?.http?.method || event.httpMethod;
        const path = event.rawPath || event.path;
        const segments = path.replace(/^\/api\//, '').split('/');
        const resource = segments[0];
        const id = segments[1];
        const tableName = tableMap[resource];

        if (!tableName) return response(404, { error: 'Unknown resource' });

        try {
          if (method === 'GET' && !id) {
            const result = await dynamo.send(new ScanCommand({ TableName: tableName }));
            return response(200, (result.Items || []).map(unmarshall));
          }

          if (method === 'GET' && id) {
            const result = await dynamo.send(new GetItemCommand({ TableName: tableName, Key: marshall({ id }) }));
            if (!result.Item) return response(404, { error: 'Not found' });
            return response(200, unmarshall(result.Item));
          }

          if (method === 'POST') {
            const body = JSON.parse(event.body);
            const item = { id: crypto.randomUUID(), ...body, createdAt: new Date().toISOString() };
            await dynamo.send(new PutItemCommand({ TableName: tableName, Item: marshall(item, { removeUndefinedValues: true }) }));
            return response(201, item);
          }

          if (method === 'PATCH' && id) {
            const body = JSON.parse(event.body);
            const updates = Object.entries(body).filter(([k]) => k !== 'id');
            if (updates.length === 0) return response(400, { error: 'No fields to update' });

            const expr = 'SET ' + updates.map(([k], i) => '#k' + i + ' = :v' + i).join(', ');
            const names = Object.fromEntries(updates.map(([k], i) => ['#k' + i, k]));
            const values = marshall(Object.fromEntries(updates.map(([, v], i) => [':v' + i, v])));

            await dynamo.send(new UpdateItemCommand({
              TableName: tableName,
              Key: marshall({ id }),
              UpdateExpression: expr,
              ExpressionAttributeNames: names,
              ExpressionAttributeValues: values,
            }));
            return response(200, { id, ...body });
          }

          if (method === 'DELETE' && id) {
            await dynamo.send(new DeleteItemCommand({ TableName: tableName, Key: marshall({ id }) }));
            return response(200, { deleted: true });
          }

          return response(405, { error: 'Method not allowed' });
        } catch (err) {
          console.error('Dashboard API error:', err);
          return response(500, { error: 'Internal server error' });
        }
      };
    EOF
    filename = "index.js"
  }
}

resource "aws_lambda_permission" "dashboard_api" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.dashboard_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "dashboard" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.dashboard_api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "dashboard_api" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "ANY /api/{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.dashboard.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.okta_jwt.id
}
