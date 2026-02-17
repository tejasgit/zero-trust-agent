resource "aws_cloudwatch_event_bus" "triage" {
  name = "${local.name_prefix}-triage-bus"

  tags = {
    Name = "${local.name_prefix}-triage-bus"
  }
}

resource "aws_cloudwatch_event_archive" "triage" {
  name             = "${local.name_prefix}-triage-archive"
  event_source_arn = aws_cloudwatch_event_bus.triage.arn
  retention_days   = 90
}

resource "aws_schemas_discoverer" "triage" {
  source_arn  = aws_cloudwatch_event_bus.triage.arn
  description = "Auto-discover event schemas for triage bus"

  tags = {
    Name = "${local.name_prefix}-schema-discoverer"
  }
}
