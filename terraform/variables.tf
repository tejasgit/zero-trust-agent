variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "zt-triage"
}

variable "okta_issuer_url" {
  description = "OKTA OIDC issuer URL (e.g., https://your-org.okta.com/oauth2/default)"
  type        = string
}

variable "okta_audience" {
  description = "OKTA audience for JWT validation"
  type        = string
  default     = "api://triage-agent"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "bedrock_model_id" {
  description = "AWS Bedrock model ID for AI triage"
  type        = string
  default     = "anthropic.claude-sonnet-4-5-20250514-v1:0"
}

variable "sns_alert_email" {
  description = "Email address for SNS operational alerts"
  type        = string
  default     = ""
}
