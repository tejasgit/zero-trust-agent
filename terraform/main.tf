terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "zt-triage-terraform-state"
    key            = "triage-agent/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "zt-triage-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "zero-trust-triage-agent"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

module "foundation" {
  source = "./modules/foundation"

  environment          = var.environment
  aws_region           = var.aws_region
  project_name         = var.project_name
  okta_issuer_url      = var.okta_issuer_url
  okta_audience        = var.okta_audience
  vpc_cidr             = var.vpc_cidr
  availability_zones   = var.availability_zones
}

module "ingestion" {
  source = "./modules/ingestion"

  environment      = var.environment
  project_name     = var.project_name
  vpc_id           = module.foundation.vpc_id
  private_subnets  = module.foundation.private_subnet_ids
  security_group_id = module.foundation.lambda_security_group_id
  api_gateway_id   = module.foundation.api_gateway_id
  api_gateway_arn  = module.foundation.api_gateway_execution_arn
  eventbridge_bus_arn = module.foundation.eventbridge_bus_arn
  incidents_table_arn = module.foundation.dynamodb_incidents_arn
  incidents_table_name = module.foundation.dynamodb_incidents_name
  audit_table_arn  = module.foundation.dynamodb_audit_arn
  audit_table_name = module.foundation.dynamodb_audit_name
  suppression_table_arn  = module.foundation.dynamodb_suppression_rules_arn
  suppression_table_name = module.foundation.dynamodb_suppression_rules_name
  webhook_secret_arn = module.foundation.webhook_secret_arn
  lambda_role_arn  = module.foundation.lambda_execution_role_arn
}

module "triage" {
  source = "./modules/triage"

  environment      = var.environment
  project_name     = var.project_name
  vpc_id           = module.foundation.vpc_id
  private_subnets  = module.foundation.private_subnet_ids
  security_group_id = module.foundation.lambda_security_group_id
  eventbridge_bus_arn = module.foundation.eventbridge_bus_arn
  eventbridge_bus_name = module.foundation.eventbridge_bus_name
  incidents_table_arn = module.foundation.dynamodb_incidents_arn
  incidents_table_name = module.foundation.dynamodb_incidents_name
  audit_table_arn  = module.foundation.dynamodb_audit_arn
  audit_table_name = module.foundation.dynamodb_audit_name
  decision_matrix_table_arn  = module.foundation.dynamodb_decision_matrix_arn
  decision_matrix_table_name = module.foundation.dynamodb_decision_matrix_name
  escalation_rules_table_arn  = module.foundation.dynamodb_escalation_rules_arn
  escalation_rules_table_name = module.foundation.dynamodb_escalation_rules_name
  gating_rules_table_arn  = module.foundation.dynamodb_gating_rules_arn
  gating_rules_table_name = module.foundation.dynamodb_gating_rules_name
  lambda_role_arn  = module.foundation.lambda_execution_role_arn
  bedrock_model_id = var.bedrock_model_id
}

module "actions" {
  source = "./modules/actions"

  environment      = var.environment
  project_name     = var.project_name
  vpc_id           = module.foundation.vpc_id
  private_subnets  = module.foundation.private_subnet_ids
  security_group_id = module.foundation.lambda_security_group_id
  eventbridge_bus_arn  = module.foundation.eventbridge_bus_arn
  eventbridge_bus_name = module.foundation.eventbridge_bus_name
  audit_table_arn  = module.foundation.dynamodb_audit_arn
  audit_table_name = module.foundation.dynamodb_audit_name
  incidents_table_arn  = module.foundation.dynamodb_incidents_arn
  incidents_table_name = module.foundation.dynamodb_incidents_name
  lambda_role_arn  = module.foundation.lambda_execution_role_arn
  servicenow_secret_arn = module.foundation.servicenow_secret_arn
  pagerduty_secret_arn  = module.foundation.pagerduty_secret_arn
  slack_secret_arn      = module.foundation.slack_secret_arn
  mim_secret_arn        = module.foundation.mim_secret_arn
}

module "observability" {
  source = "./modules/observability"

  environment      = var.environment
  project_name     = var.project_name
  aws_region       = var.aws_region
  ingestion_lambda_name = module.ingestion.lambda_function_name
  triage_lambda_name    = module.triage.lambda_function_name
  action_lambda_names   = module.actions.lambda_function_names
  api_gateway_name      = module.foundation.api_gateway_name
  api_gateway_id        = module.foundation.api_gateway_id
  incidents_table_name  = module.foundation.dynamodb_incidents_name
  sns_alert_email       = var.sns_alert_email
}
