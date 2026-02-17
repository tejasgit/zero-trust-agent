output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = module.foundation.api_gateway_invoke_url
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.foundation.vpc_id
}

output "cloudwatch_dashboard_url" {
  description = "CloudWatch dashboard URL"
  value       = module.observability.dashboard_url
}
