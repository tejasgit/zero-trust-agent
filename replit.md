# Zero-Trust Autonomous Incident Triage Agent

## Overview
AI-driven incident classification, escalation, and Major Incident Management (MIM) orchestration dashboard. Uses AWS Bedrock (Claude Sonnet 4.5) for zero-trust AI triage with full Terraform IaC for AWS deployment and Cloudflare Pages for the dashboard SPA.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui (deployable to Cloudflare Pages)
- **Backend**: Express.js with REST API (development) / AWS API Gateway + Lambda (production)
- **Database**: PostgreSQL with Drizzle ORM (development) / DynamoDB (production via Terraform)
- **AI Engine**: AWS Bedrock (Claude Sonnet 4.5) for incident classification
- **Infrastructure**: Terraform modules for VPC, IAM, API Gateway, Lambda, DynamoDB, EventBridge, CloudWatch
- **Auth**: OKTA JWT authorization on API Gateway, HMAC-SHA256 on webhooks
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack React Query with configurable API base URL (VITE_API_BASE_URL)

## Data Models
- **incidents**: Alert events with AI classification, confidence scores, status, source, integration IDs (SNOW/PD/MIM)
- **auditLogs**: Complete decision audit trail with actors, actions, correlation IDs
- **policyRules**: Deterministic escalation rules with enable/disable toggles
- **eventSources**: Connected platform integrations with heartbeat tracking
- **systemSettings**: Maturity level (0-3), thresholds, feature flags
- **escalationRules**: Condition-based rules mapping classifications to actions (PD/SNOW/Slack/MIM)
- **gatingRules**: Confidence thresholds and HITL approval gates per action type
- **suppressionRules**: Regex pattern matching on source/title with expiry dates
- **decisionMatrix**: Severity-based action matrix (INC/MIM/Page toggles)

## Pages
- `/` - Dashboard with metrics, charts, recent incidents
- `/incidents` - Filterable incident list
- `/incidents/:id` - Incident detail with AI reasoning, audit trail, integration IDs
- `/policies` - Policy engine with toggleable rules
- `/escalation-rules` - Condition builder with action targets and configs
- `/gating-rules` - Confidence thresholds, human approval toggles, fallback actions
- `/suppression-rules` - Pattern filters, time windows, expiry dates, suppressed counts
- `/decision-matrix` - Inline-editable severity matrix with INC/MIM/Page toggles
- `/architecture` - Pipeline visualization with security layers and threat model
- `/audit` - Searchable audit trail
- `/sources` - Event source status monitoring
- `/settings` - Maturity model selector, escalation controls, thresholds

## API Endpoints
- `GET/POST /api/incidents` - List/create incidents
- `GET/PATCH /api/incidents/:id` - Get/update incident
- `GET /api/audit` - All audit logs
- `GET /api/audit/:incidentId` - Audit logs for specific incident
- `GET/PATCH /api/policies` - List/update policy rules
- `GET /api/sources` - Event sources
- `GET/PATCH /api/settings` - System settings
- `GET/POST /api/escalation-rules` - List/create escalation rules
- `GET/PATCH/DELETE /api/escalation-rules/:id` - CRUD escalation rule
- `GET/POST /api/gating-rules` - List/create gating rules
- `GET/PATCH/DELETE /api/gating-rules/:id` - CRUD gating rule
- `GET/POST /api/suppression-rules` - List/create suppression rules
- `GET/PATCH/DELETE /api/suppression-rules/:id` - CRUD suppression rule
- `GET/POST /api/decision-matrix` - List/create decision matrix entries
- `GET/PATCH/DELETE /api/decision-matrix/:id` - CRUD decision matrix entry

## Terraform Infrastructure (terraform/)
- **foundation**: VPC (3 AZ), IAM with permission boundaries, DynamoDB (PITR + encryption + TTL), API Gateway with OKTA JWT authorizer, Secrets Manager (auto-rotation), CloudTrail, Dashboard API Lambda
- **ingestion**: Webhook receiver Lambda (HMAC-SHA256 validation, dedup via dedup# prefix, suppression regex), EventBridge routing
- **triage**: Bedrock Claude invocation Lambda, decision matrix evaluation, audit logging
- **actions**: ServiceNow, PagerDuty, MIM, Slack handler Lambdas
- **observability**: CloudWatch dashboards (4-widget), metric alarms (error rates, latency, throttling, DynamoDB), SNS alerts

## Cloudflare Pages Deployment
- wrangler.toml configured with `pages_build_output_dir = "dist/public"`
- SPA routing via `_redirects` file
- Set `VITE_API_BASE_URL` env var to AWS API Gateway URL for production

## Key Features
- Maturity model toggles (Level 0-3)
- AI classification with confidence scoring via AWS Bedrock
- Deterministic policy engine with governance controls
- Full audit trail with correlation tracking
- Dark/light theme support
- Inline-editable decision matrix
- HMAC-SHA256 webhook validation with replay protection
- Idempotent ingestion with DynamoDB dedup records (24h TTL)
- OKTA JWT authorization on all dashboard API routes

## Security Design
- Zero-trust: fail-closed, verify every request
- 5-layer prompt injection defense in Bedrock prompts
- STRIDE threat model (T1-T14) documented in technical specification
- IAM permission boundaries on all Lambda roles
- VPC endpoints for DynamoDB and Secrets Manager (no internet egress)
- HMAC-SHA256 on webhooks, OKTA JWT on dashboard APIs
