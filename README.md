# ZTAIT: Zero-Trust Autonomous Incident Triage

A comprehensive framework for governing autonomous AI agents in enterprise incident response. ZTAIT unifies AI agent governance, zero-trust identity management, and deterministic policy enforcement into a single coherent architecture with a complete reference implementation.

## Repository Structure

```
├── terraform/                  # Infrastructure as Code (AWS)
│   └── modules/
│       ├── foundation/         # VPC, IAM, DynamoDB, API Gateway, Secrets Manager
│       ├── ingestion/          # Webhook receiver, EventBridge, deduplication
│       ├── triage/             # AWS Bedrock AI classification, prompt defense
│       ├── actions/            # ServiceNow, PagerDuty, MIM, Slack handlers
│       └── observability/      # CloudWatch dashboards, alarms, SNS
├── client/                     # React governance dashboard (Cloudflare Pages)
│   └── src/
│       ├── pages/              # Dashboard, Incidents, Policies, Audit, Settings, etc.
│       ├── components/         # Shared UI components (shadcn/ui)
│       └── lib/                # API client, query configuration
├── server/                     # Express.js development API server
│   ├── routes.ts               # REST API route definitions
│   └── storage.ts              # Database storage interface
├── shared/                     # Shared types and schemas (Drizzle + Zod)
│   └── schema.ts               # Data models for incidents, audit, policies, rules
├── docs/                       # Publications and specifications
│   ├── TECHNICAL_SPECIFICATION.md
│   ├── ZTAIT_FRAMEWORK.md
│   ├── ZTAIT_ARXIV_PAPER.md
│   ├── ZTAIT_ARXIV_ENDORSEMENT_BRIEF.md
│   ├── ZTAIT_EXECUTIVE_BRIEF.md
│   └── peerj/
│       └── ZTAIT_PEERJ_PAPER.md
└── wrangler.toml               # Cloudflare Pages deployment config
```

## Architecture Overview

### Production Deployment (AWS + Cloudflare)

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui, deployed on Cloudflare Pages
- **Backend**: AWS API Gateway + Lambda (serverless)
- **Database**: DynamoDB with Point-in-Time Recovery, encryption at rest, TTL for dedup records
- **AI Engine**: AWS Bedrock (Claude Sonnet 4.5) with 5-layer prompt injection defense
- **Identity**: OKTA JWT authorization on dashboard APIs, HMAC-SHA256 on webhooks
- **Observability**: CloudWatch dashboards, metric alarms, SNS notifications

### Development Environment

- **Frontend**: Same React app served by Vite dev server
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM

## Terraform Modules

The infrastructure is defined across five composable Terraform modules (~1,130 lines of HCL):

| Module | Description |
|---|---|
| **foundation** | VPC (3 AZ), NAT gateway, 4 VPC endpoints, IAM roles with permission boundaries, 7 DynamoDB tables, API Gateway with OKTA JWT authorizer, Secrets Manager, CloudTrail |
| **ingestion** | Webhook receiver Lambda with HMAC-SHA256 validation, anti-replay protection, idempotent deduplication, suppression rule evaluation, EventBridge routing |
| **triage** | Bedrock Claude invocation with structured prompts, output schema validation, decision matrix evaluation, trust scoring, audit logging |
| **actions** | ServiceNow, PagerDuty, MIM, and Slack handler Lambdas with per-integration OKTA service accounts, circuit breakers, idempotency keys |
| **observability** | CloudWatch dashboard (4 widgets), metric alarms (error rate, latency, throttling, DynamoDB capacity), SNS alert topics |

### Deploying Infrastructure

```bash
cd terraform
terraform init
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

Required variables (see `terraform/variables.tf`):
- `aws_region` — Target AWS region
- `environment` — Deployment environment name (e.g., production)
- `vpc_cidr` — VPC CIDR block
- `availability_zones` — List of 3 AZs
- `okta_issuer_url` — OKTA tenant issuer URL for JWT validation
- `bedrock_model_id` — AWS Bedrock model identifier

## Governance Dashboard

The dashboard provides 12 pages for managing the triage agent:

| Page | Path | Purpose |
|---|---|---|
| Dashboard | `/` | Metrics overview, classification charts, recent incidents |
| Incidents | `/incidents` | Filterable incident list with status, severity, source |
| Incident Detail | `/incidents/:id` | AI reasoning, audit trail, integration IDs |
| Escalation Rules | `/escalation-rules` | Condition builder mapping classifications to actions |
| Gating Rules | `/gating-rules` | Confidence thresholds, human approval gates |
| Suppression Rules | `/suppression-rules` | Regex pattern filters with time windows and expiry |
| Decision Matrix | `/decision-matrix` | Inline-editable severity-to-action matrix |
| Policy Rules | `/policies` | Deterministic policy engine with toggleable rules |
| Architecture | `/architecture` | Pipeline visualization with security layers |
| Audit Trail | `/audit` | Searchable audit log with correlation linking |
| Event Sources | `/sources` | Connected platform status monitoring |
| Settings | `/settings` | Maturity level selector (L0-L3), thresholds |

### Deploying the Dashboard (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy dist/public --project-name=ztait-dashboard
```

Set the `VITE_API_BASE_URL` environment variable in Cloudflare Pages to point to your AWS API Gateway endpoint.

## Maturity Model

ZTAIT defines four progressive autonomy levels:

| Level | Name | Agent Behavior | Exit Criteria |
|---|---|---|---|
| L0 | Shadow | Classifies in parallel, no actions taken | ≥85% agreement over 30 days on ≥200 incidents |
| L1 | Assisted | Recommendations shown, human approves each | Override rate ≤15%, no P1/P2 misclassification |
| L2 | Supervised | Auto-execute P3/P4, gated P1/P2 | P1/P2 approval rate ≥95%, zero false MIM |
| L3 | Autonomous | Full auto-execution, human post-review | Accuracy ≥95% ongoing, auto-regress if <90% |

Transitions between levels are controlled through Terraform configuration variables, ensuring every change is version-controlled and peer-reviewed.

## Security Design

- **Zero Trust**: Fail-closed, verify every request at every boundary
- **14 STRIDE-classified threats** with dual mitigations at different architectural layers
- **5-layer prompt injection defense**: input sanitization, structured prompts, Bedrock Guardrails, output validation, behavioral monitoring
- **IAM permission boundaries** preventing privilege escalation across all Lambda roles
- **VPC isolation** with NAT gateway (HTTPS-only egress) and VPC endpoints for AWS services
- **HMAC-SHA256** webhook validation with anti-replay protection
- **OKTA JWT** authorization on all dashboard API routes

## Documentation

| Document | Description |
|---|---|
| `docs/TECHNICAL_SPECIFICATION.md` | 70+ page technical specification covering architecture, security, APIs, Terraform, and threat model |
| `docs/ZTAIT_FRAMEWORK.md` | Formal framework specification with maturity model, trust scoring engine, policy engine, and compliance mapping |
| `docs/ZTAIT_ARXIV_PAPER.md` | ArXiv paper draft (cs.CR/cs.AI) covering the full ZTAIT framework |
| `docs/ZTAIT_ARXIV_ENDORSEMENT_BRIEF.md` | One-page ArXiv endorsement brief |
| `docs/ZTAIT_EXECUTIVE_BRIEF.md` | Executive-audience summary with business value and adoption roadmap |
| `docs/peerj/ZTAIT_PEERJ_PAPER.md` | PeerJ Computer Science paper focused on Infrastructure as Code for AI Agent Governance |

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (development database)

### Running Locally

```bash
npm install
npm run dev
```

This starts both the Express API server and Vite dev server on port 5000.

### Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (development) |
| `SESSION_SECRET` | Express session secret |
| `VITE_API_BASE_URL` | API base URL for frontend (production only — points to API Gateway) |

## License

MIT License (Personal Use Only) — See [LICENSE](LICENSE) for details. This software is provided for personal, educational, and non-commercial use only. Commercial use requires prior written permission from the copyright holder.
