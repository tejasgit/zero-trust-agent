locals {
  name_prefix = "${var.project_name}-${var.environment}"
  all_lambda_names = merge(
    {
      ingestion = var.ingestion_lambda_name
      triage    = var.triage_lambda_name
    },
    var.action_lambda_names
  )
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-operational-alerts"

  tags = {
    Name = "${local.name_prefix}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.sns_alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.sns_alert_email
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.all_lambda_names

  name              = "/aws/lambda/${each.value}"
  retention_in_days = 90

  tags = {
    Name = "${local.name_prefix}-${each.key}-logs"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = local.all_lambda_names

  alarm_name          = "${local.name_prefix}-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda ${each.key} error rate exceeds threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = each.value
  }

  tags = {
    Name = "${local.name_prefix}-${each.key}-error-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "triage_duration" {
  alarm_name          = "${local.name_prefix}-triage-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "p99"
  threshold           = 60000
  alarm_description   = "Triage engine p99 latency exceeds 60s"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = var.triage_lambda_name
  }

  tags = {
    Name = "${local.name_prefix}-triage-duration-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${local.name_prefix}-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5xx error rate exceeds threshold"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = var.api_gateway_id
  }

  tags = {
    Name = "${local.name_prefix}-api-5xx-alarm"
  }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${local.name_prefix}-triage-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Lambda Invocations"
          metrics = [for k, v in local.all_lambda_names : ["AWS/Lambda", "Invocations", "FunctionName", v, { label = k }]]
          view    = "timeSeries"
          region  = var.aws_region
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Lambda Errors"
          metrics = [for k, v in local.all_lambda_names : ["AWS/Lambda", "Errors", "FunctionName", v, { label = k, color = "#d62728" }]]
          view    = "timeSeries"
          region  = var.aws_region
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Triage Engine Duration (ms)"
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", var.triage_lambda_name, { stat = "p50", label = "p50" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.triage_lambda_name, { stat = "p90", label = "p90" }],
            ["AWS/Lambda", "Duration", "FunctionName", var.triage_lambda_name, { stat = "p99", label = "p99" }],
          ]
          view   = "timeSeries"
          region = var.aws_region
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "API Gateway Requests"
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", var.api_gateway_id, { label = "Total" }],
            ["AWS/ApiGateway", "4xx", "ApiId", var.api_gateway_id, { label = "4xx", color = "#ff7f0e" }],
            ["AWS/ApiGateway", "5xx", "ApiId", var.api_gateway_id, { label = "5xx", color = "#d62728" }],
          ]
          view   = "timeSeries"
          region = var.aws_region
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          title   = "DynamoDB - Incidents Table"
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", var.incidents_table_name, { label = "Reads" }],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", var.incidents_table_name, { label = "Writes" }],
            ["AWS/DynamoDB", "ThrottledRequests", "TableName", var.incidents_table_name, { label = "Throttled", color = "#d62728" }],
          ]
          view   = "timeSeries"
          region = var.aws_region
          period = 300
        }
      },
    ]
  })
}

output "dashboard_url" {
  value = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}
