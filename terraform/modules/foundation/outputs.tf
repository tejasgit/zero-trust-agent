output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda.id
}

output "lambda_execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}

output "api_gateway_id" {
  value = aws_apigatewayv2_api.main.id
}

output "api_gateway_execution_arn" {
  value = aws_apigatewayv2_api.main.execution_arn
}

output "api_gateway_invoke_url" {
  value = aws_apigatewayv2_stage.main.invoke_url
}

output "api_gateway_name" {
  value = aws_apigatewayv2_api.main.name
}

output "api_gateway_authorizer_id" {
  value = aws_apigatewayv2_authorizer.okta_jwt.id
}

output "eventbridge_bus_arn" {
  value = aws_cloudwatch_event_bus.triage.arn
}

output "eventbridge_bus_name" {
  value = aws_cloudwatch_event_bus.triage.name
}

output "dynamodb_incidents_arn" {
  value = aws_dynamodb_table.incidents.arn
}

output "dynamodb_incidents_name" {
  value = aws_dynamodb_table.incidents.name
}

output "dynamodb_audit_arn" {
  value = aws_dynamodb_table.audit_logs.arn
}

output "dynamodb_audit_name" {
  value = aws_dynamodb_table.audit_logs.name
}

output "dynamodb_escalation_rules_arn" {
  value = aws_dynamodb_table.escalation_rules.arn
}

output "dynamodb_escalation_rules_name" {
  value = aws_dynamodb_table.escalation_rules.name
}

output "dynamodb_gating_rules_arn" {
  value = aws_dynamodb_table.gating_rules.arn
}

output "dynamodb_gating_rules_name" {
  value = aws_dynamodb_table.gating_rules.name
}

output "dynamodb_suppression_rules_arn" {
  value = aws_dynamodb_table.suppression_rules.arn
}

output "dynamodb_suppression_rules_name" {
  value = aws_dynamodb_table.suppression_rules.name
}

output "dynamodb_decision_matrix_arn" {
  value = aws_dynamodb_table.decision_matrix.arn
}

output "dynamodb_decision_matrix_name" {
  value = aws_dynamodb_table.decision_matrix.name
}

output "webhook_secret_arn" {
  value = aws_secretsmanager_secret.webhook.arn
}

output "servicenow_secret_arn" {
  value = aws_secretsmanager_secret.servicenow.arn
}

output "pagerduty_secret_arn" {
  value = aws_secretsmanager_secret.pagerduty.arn
}

output "slack_secret_arn" {
  value = aws_secretsmanager_secret.slack.arn
}

output "mim_secret_arn" {
  value = aws_secretsmanager_secret.mim.arn
}
