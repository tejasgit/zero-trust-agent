# Infrastructure as Code for AI Agent Governance: A Terraform-Based Reference Architecture for Zero-Trust Autonomous Incident Triage

## Author Cover Page

**Title:** Infrastructure as Code for AI Agent Governance: A Terraform-Based Reference Architecture for Zero-Trust Autonomous Incident Triage

**Authors:**

[Author First Name] [Author Middle Initial]. [Author Last Name]^1

**Affiliations:**

^1 [Department], [University/Organization], [City], [State/Province], [Country]

**Submission Admin:**

[First Name] [Last Name]
[Email Address]

---

## Abstract

**Background.** Autonomous AI agents are increasingly deployed in enterprise incident response pipelines, where they classify alerts, escalate incidents, and orchestrate Major Incident Management processes at machine speed. These agents require write access to production systems such as ServiceNow, PagerDuty, and incident communication bridges, yet no existing governance framework specifies how to enforce security and governance properties at the infrastructure deployment layer. Current frameworks — NIST AI RMF, ISO 42001, CSA Zero-Trust IAM for Agents — address AI lifecycle management or agent identity in isolation but provide no deployable reference architecture that codifies governance as infrastructure.

**Methods.** We present a modular Infrastructure as Code (IaC) reference architecture, implemented in Terraform, for deploying a zero-trust governance framework around an autonomous AI triage agent on AWS. The architecture comprises five composable modules (foundation, ingestion, triage, actions, observability) totaling approximately 1,130 lines of HashiCorp Configuration Language. We identify 14 security invariants and map each to specific Terraform resource declarations that enforce them declaratively. We introduce a four-level maturity model (Shadow, Assisted, Supervised, Autonomous) controlled entirely through infrastructure configuration variables rather than application code changes. We evaluate the architecture against NIST SP 800-207 zero-trust tenets and conduct a comparative analysis across six existing AI agent governance frameworks.

**Results.** The reference architecture enforces all 14 security invariants through declarative infrastructure definitions, including VPC-isolated compute with controlled egress through NAT gateway and VPC endpoints for AWS services, IAM permission boundaries on all Lambda execution roles, HMAC-SHA256 webhook validation with anti-replay protection, and automated secret rotation. Comparative analysis shows that the architecture achieves coverage across ten governance capability dimensions — agent-specific controls, governance maturity modeling, zero-trust identity, quantitative trust scoring, prompt injection defense, deterministic policy enforcement, STRIDE threat modeling, compliance mapping, reference implementation, and enterprise integration — while no other surveyed framework covers more than four. The architecture has been validated through deployment on AWS, producing 47 managed resources across five modules.

**Conclusions.** Codifying AI agent governance as Infrastructure as Code provides three advantages over application-level enforcement: security invariants are declaratively guaranteed rather than programmatically asserted, configuration drift is prevented by the Terraform state model, and governance properties become auditable through version-controlled infrastructure definitions. The reference architecture demonstrates that enterprise-grade AI agent governance is achievable with current cloud-native technology and can be adopted incrementally through the maturity model's progressive autonomy levels.

**Keywords:** Infrastructure as Code, Zero Trust Architecture, AI Agent Governance, Terraform, Autonomous Incident Response, Cloud Security, DevSecOps

---

## 1. Background

### 1.1 The Rise of Autonomous AI Agents in Enterprise Operations

The proliferation of monitoring tools in enterprise environments has created an alert volume crisis. Large enterprises routinely generate tens of thousands of monitoring alerts daily across observability platforms, cloud provider health APIs, IT service management systems, and business application events (Gartner, 2025). Manual triage of this volume is increasingly unsustainable: industry surveys report that Level-1 engineers spend a majority of their time on alert noise rather than incident resolution, and Mean Time to Detect (MTTD) for critical incidents remains measured in hours rather than minutes (McKinsey, 2025a).

Large Language Models (LLMs) deployed as autonomous triage agents offer a promising solution. An LLM-powered agent can classify alerts by correlating signals across monitoring systems, assess blast radius and revenue impact, and execute escalation actions — creating ServiceNow incidents, paging on-call engineers, and declaring Major Incidents — in seconds rather than the minutes or hours required for manual triage.

However, deploying an autonomous AI agent with write access to production incident management systems introduces governance and security challenges that existing frameworks fail to address at the infrastructure level.

### 1.2 The Governance Gap at the Infrastructure Layer

Current AI governance frameworks operate at the organizational or model level, not at the infrastructure deployment level:

**NIST AI Risk Management Framework (AI RMF 1.0)** (NIST, 2023a) provides a voluntary framework organized around four functions: GOVERN, MAP, MEASURE, and MANAGE. While comprehensive for AI system lifecycle management, AI RMF does not address the unique challenges of autonomous agents — real-time action constraints, progressive autonomy models, or agent-specific threat vectors — and offers no guidance on how infrastructure should enforce governance properties.

**ISO/IEC 42001:2023** (ISO/IEC, 2023) establishes requirements for an AI Management System (AIMS). Like AI RMF, it provides organizational-level guidance but does not address agent-level infrastructure controls.

**Cloud Security Alliance Zero-Trust IAM for Agents** (CSA, 2025a) proposes a zero-trust IAM framework using Decentralized Identifiers and Verifiable Credentials for agent identity. While conceptually aligned with zero-trust principles, the proposal remains theoretical without a reference implementation or infrastructure specification.

**Narajala, Rao et al. (2025)** presented a novel agentic AI IAM framework using DIDs/VCs, fine-grained access control, unified session management, and zero-knowledge proofs for policy compliance. Their work addresses cross-organizational agent trust but does not specify deployment infrastructure.

**OWASP Top 10 for Agentic AI Security** (OWASP, 2025) identifies primary security risks for AI agents, including prompt injection, excessive agency, and insecure output handling. OWASP catalogs threats but does not provide infrastructure-level mitigations.

**Acuvity Agent Integrity Framework** (Acuvity, 2025) defines five maturity levels focused on security integrity, including continuous verification at the semantic level. However, it focuses on security controls rather than the full governance lifecycle and provides no deployable implementation.

These frameworks share a common limitation: they describe *what* governance properties should hold, but not *how* infrastructure should enforce them. This distinction matters because application-level enforcement is fundamentally weaker than infrastructure-level enforcement. An application-level access control check can be bypassed by a code defect, a misconfigured environment variable, or a compromised dependency. An IAM permission boundary enforced at the cloud provider level cannot be bypassed by any application code — it is architecturally guaranteed.

### 1.3 Infrastructure as Code for Security Governance

Infrastructure as Code (IaC) — the practice of defining cloud resources through machine-readable configuration files rather than manual console operations — has become the dominant paradigm for enterprise cloud deployment (HashiCorp, 2025). Terraform, the most widely adopted IaC tool, uses a declarative configuration language (HCL) to define desired infrastructure state, with the Terraform engine computing and executing the minimal set of API calls needed to achieve that state.

IaC provides three properties that are uniquely valuable for AI agent governance:

**Declarative Guarantees.** A Terraform resource definition is a declaration of desired state, not an imperative procedure. When a VPC endpoint is declared without an internet gateway route, the resulting infrastructure *cannot* have internet egress — not because application code prevents it, but because the network topology makes it impossible.

**Drift Prevention.** Terraform maintains a state file that records the actual infrastructure configuration. Any manual change (console modification, CLI override) creates drift that is detected on the next `terraform plan` and can be automatically corrected. This property prevents the "configuration erosion" that degrades application-level security controls over time.

**Auditability.** Terraform configuration files are version-controlled, peer-reviewed, and merge-gated through standard software engineering practices. Every infrastructure change has an author, a reviewer, a timestamp, and a diff — the same audit trail that governance frameworks require for policy changes.

Despite these properties, limited prior work has applied IaC specifically to AI agent governance. Existing IaC security research focuses on static analysis of Terraform configurations for compliance violations (Opdebeeck, De Roover & De Meuter, 2022) and automated remediation of cloud misconfigurations (Rahman et al., 2021). The application of IaC as a *governance enforcement mechanism* for autonomous AI agents represents, to our knowledge, an underexplored approach.

### 1.4 Contributions

This paper makes four contributions:

**C1.** A modular IaC reference architecture comprising five Terraform modules that collectively enforce 14 security invariants through declarative infrastructure definitions rather than application-level controls.

**C2.** A demonstration that a four-level governance maturity model (Shadow, Assisted, Supervised, Autonomous) can be controlled entirely through Terraform configuration variables, enabling governance transitions through infrastructure changes rather than application code modifications.

**C3.** A mapping of 14 security invariants to specific Terraform resource declarations, showing how each governance property is enforced at the infrastructure layer with the corresponding STRIDE threat it mitigates.

**C4.** A comparative evaluation against six existing AI agent governance frameworks across ten capability dimensions, demonstrating that the architecture achieves comprehensive governance coverage.

### 1.5 Paper Organization

Section 2 presents the design principles. Section 3 describes the reference architecture. Section 4 details the security invariants and their infrastructure enforcement. Section 5 presents the maturity model as infrastructure configuration. Section 6 evaluates the architecture. Section 7 discusses implications and limitations. Section 8 concludes.

---

## 2. Design Principles

The reference architecture is built on seven principles that govern every infrastructure decision. These principles are adapted from the ZTAIT (Zero-Trust Autonomous Incident Triage) framework, which unifies AI agent governance, zero-trust identity management, and deterministic policy enforcement (ZTAIT Framework, 2026).

**P1. Never Trust, Always Verify.** Every request — from external webhooks, dashboard operators, and the AI agent itself — is authenticated and authorized at every boundary. No implicit trust exists between components. Infrastructure enforcement: separate IAM roles per Lambda function, OKTA JWT authorizer on API Gateway, HMAC-SHA256 validation on webhook endpoints.

**P2. Fail Closed.** When any component fails — authentication, classification, action execution — the system defaults to the most restrictive behavior: human review. Infrastructure enforcement: Lambda dead-letter queues, EventBridge retry policies with exponential backoff, and missing environment variable checks that prevent function execution.

**P3. Least Privilege, Narrowest Scope.** Every identity (human, service, compute, AI model) receives only the minimum permissions required for its specific function, scoped to the narrowest possible resource set. Infrastructure enforcement: per-Lambda IAM roles with resource-level ARN scoping and a system-wide permission boundary that denies destructive actions.

**P4. Complete Auditability.** Every decision — ingestion, classification, suppression, action execution, rule change, human override — is recorded with the actor's identity, timestamp, reasoning, and correlation ID. Infrastructure enforcement: CloudTrail enabled on all API calls, DynamoDB audit table with no delete permissions granted to any role, S3 audit bucket with versioning and MFA-delete protection.

**P5. Progressive Autonomy.** Agent autonomy increases only as organizational trust is earned through demonstrated accuracy, not through configuration alone. Each maturity level has measurable entry criteria and automatic regression on accuracy degradation. Infrastructure enforcement: Terraform variables that control gating thresholds, approval requirements, and action permissions per maturity level.

**P6. Defense in Depth.** Every threat in the STRIDE model has at least two independent mitigations at different architectural layers. Infrastructure enforcement: defense mechanisms distributed across VPC (network layer), IAM (identity layer), Lambda (application layer), and CloudWatch (observability layer).

**P7. Deterministic Constraints on Non-Deterministic AI.** The AI model's outputs are constrained by deterministic policy rules that humans can understand, audit, and modify. The AI recommends; the policy engine decides. Infrastructure enforcement: the policy engine executes in a separate Lambda function from the AI classification, with its own IAM role scoped to read-only access on policy tables and write access only to the action routing bus.

---

## 3. Reference Architecture

### 3.1 Architecture Overview

The reference architecture implements an event-driven triage pipeline deployed on AWS using five composable Terraform modules. Each module encapsulates a distinct governance concern and exposes typed outputs that downstream modules consume as inputs, enforcing interface contracts at the infrastructure level.

The pipeline processes an incident through four stages: (1) ingestion and validation, (2) AI classification via AWS Bedrock, (3) policy engine evaluation against deterministic rules, and (4) action execution through authenticated integration adapters. Each stage executes in an isolated Lambda function with its own IAM role, VPC security group, and observability instrumentation.

### 3.2 Module Decomposition

**Table 1.** Terraform module decomposition with resource counts and governance responsibilities.

| Module | Resources | Lines (HCL) | Governance Responsibility |
|---|---|---|---|
| Foundation | VPC, subnets (3 AZ), NAT gateway, VPC endpoints (4), IAM roles, permission boundaries, DynamoDB tables (7), API Gateway, OKTA JWT authorizer, Secrets Manager, CloudTrail | 193 | Network isolation, identity management, data persistence, API authentication, secret lifecycle |
| Ingestion | Webhook receiver Lambda, API Gateway routes, EventBridge event bus, DynamoDB dedup table | 218 | Webhook validation (HMAC-SHA256), anti-replay, deduplication, suppression rule evaluation |
| Triage | Bedrock invocation Lambda, structured prompt template, output validation schema, decision matrix evaluation | 291 | AI classification, prompt injection defense (5 layers), confidence thresholds, trust scoring |
| Actions | ServiceNow, PagerDuty, MIM, Slack handler Lambdas, OKTA service account configuration, circuit breakers | 233 | Authenticated action execution, per-integration least privilege, idempotency, failure isolation |
| Observability | CloudWatch dashboard (4 widgets), metric alarms, SNS notification topics | 196 | Error rate monitoring, latency tracking, throttling alerts, DynamoDB capacity alarms |
| **Total** | **47 managed resources** | **1,131** | |

### 3.3 Foundation Module

The foundation module establishes the security perimeter within which all other components operate. It provisions a Virtual Private Cloud (VPC) spanning three Availability Zones with private subnets for compute workloads and public subnets for NAT gateway placement. Lambda functions execute exclusively in private subnets with egress routed through a NAT gateway, ensuring that no Lambda function has a publicly routable IP address. VPC endpoints for DynamoDB, Secrets Manager, Bedrock Runtime, and EventBridge enable Lambda functions to access AWS services without traversing the NAT gateway, reducing both latency and the attack surface for AWS API traffic. External service calls (OKTA authentication, ServiceNow/PagerDuty API calls) route through the NAT gateway over HTTPS (port 443 only), with the Lambda security group restricting all other egress.

Identity management is centralized through IAM roles with a system-wide permission boundary. The permission boundary is an IAM policy that acts as a ceiling on permissions — even if a role's policy grants broader access, the permission boundary restricts the effective permissions to the intersection. The ZTAIT permission boundary explicitly denies: assuming other IAM roles, modifying IAM policies, deleting CloudTrail logs, creating or deleting VPC resources, and accessing resources outside the `ztait-*` namespace. This ensures that a compromised Lambda function cannot escalate privileges or move laterally within the AWS account.

Seven DynamoDB tables provide data persistence: incidents, audit logs, policy rules, event sources, system settings, escalation rules, and a deduplication table with 24-hour TTL. All tables are configured with Point-in-Time Recovery (PITR), encryption at rest using AWS-managed KMS keys, and pay-per-request billing mode (eliminating capacity planning as a governance concern).

The API Gateway serves as the entry point for both webhook ingestion and dashboard API calls. An OKTA JWT authorizer validates bearer tokens on all dashboard routes, enforcing authentication at the infrastructure layer before any Lambda code executes. Webhook routes use a separate authentication path (HMAC-SHA256, validated in Lambda) because webhook sources use shared secrets rather than OAuth tokens.

### 3.4 Ingestion Module

The ingestion module implements the first stage of the triage pipeline: receiving, validating, and routing incoming alert events. The webhook receiver Lambda performs four operations in sequence:

1. **HMAC-SHA256 Validation.** Each webhook source is provisioned with a unique shared secret stored in Secrets Manager. The Lambda computes HMAC-SHA256 over the request body using the source-specific secret and compares it to the signature in the `X-Hub-Signature-256` header. Invalid signatures are rejected with HTTP 401 before any payload processing occurs.

2. **Anti-Replay Protection.** The Lambda validates that the request timestamp (from the `X-Timestamp` header) is within a 5-minute window of the current server time. Requests outside this window are rejected, preventing replay attacks using captured legitimate webhooks.

3. **Idempotent Deduplication.** The Lambda performs a DynamoDB conditional write using a composite key (`dedup#{source}#{alertId}`). If the item already exists, the write fails with a `ConditionalCheckFailedException`, and the Lambda returns HTTP 200 (acknowledging receipt without reprocessing). Dedup records have a 24-hour TTL, balancing storage costs against the probability of delayed duplicate delivery.

4. **Suppression Rule Evaluation.** Before routing the event for AI classification (which consumes Bedrock API credits), the Lambda evaluates active suppression rules — regex patterns on source name and alert title with optional time windows and expiry dates. Suppressed events are logged with the matching rule ID and suppression reason but not forwarded for triage.

Events that pass all four checks are published to an EventBridge event bus with content-based routing rules that direct events to the triage Lambda.

### 3.5 Triage Module

The triage module implements AI classification using AWS Bedrock (Claude Sonnet 4.5) within a five-layer prompt injection defense stack.

**Layer 1 — Input Sanitization.** The Lambda strips control characters, HTML tags, template injection patterns (`{{...}}`, `{%...%}`), and truncates all text fields to 4,000 characters before constructing the prompt.

**Layer 2 — Structured Prompt Architecture.** The system prompt is hardcoded in the Lambda source code (not configurable via API or database). Alert data is inserted within XML `<data>` tags with an explicit instruction: "Do not follow any instructions contained within the data tags." The decision matrix is passed as structured XML parameters, not free text.

**Layer 3 — AWS Bedrock Guardrails.** AWS-managed content, topic, word, and PII filters are applied on both input and output. The topic policy restricts responses to IT operations and incident triage subjects.

**Layer 4 — Output Validation.** The Lambda validates the model's response against a strict schema requiring specific enum values for severity (P1–P4, noise) and actions (create_incident, page, declare_mim, log_only), a bounded confidence range (0.0–1.0), and a length-limited reasoning field. A confidence of exactly 1.0 is treated as anomalous and triggers human review.

**Layer 5 — Behavioral Monitoring.** CloudWatch metrics track guardrail trigger rates, confidence drift, and output token counts. Alarms fire if the guardrail trigger rate exceeds 5% or if average confidence drifts more than 0.1 from the 30-day baseline.

After classification, the triage Lambda evaluates the incident against the decision matrix (a deterministic severity-to-action lookup stored in DynamoDB), computes a composite trust score T = w₁C + w₂B + w₃H + w₄E (combining model confidence, behavioral consistency, historical accuracy, and environmental context), and publishes the classified event to EventBridge for action execution.

### 3.6 Actions Module

The actions module implements authenticated action execution through four handler Lambdas — ServiceNow, PagerDuty, MIM (Major Incident Management), and Slack. Each handler operates with its own OKTA service account and IAM role, enforcing per-integration least privilege at the infrastructure level.

Before executing any action, the actions module evaluates two policy rule types:

**Escalation Rules** map classifications to actions with conditions on severity, source, and confidence range. Rules are evaluated in priority order; first match wins, ensuring deterministic, auditable action selection.

**Gating Rules** intercept high-impact actions (MIM declaration, P1 paging) and require human approval when the trust score is below a configured threshold. Gating rules include timeout handling: either auto-approve or auto-suppress after a configurable period.

Each handler Lambda uses per-request idempotency keys (correlation ID + action type) to prevent duplicate action execution on retries or EventBridge redelivery. Circuit breakers (implemented as DynamoDB counters with TTL) prevent cascading failures when downstream services are unavailable — after 5 consecutive failures to a target service, the circuit opens and routes actions to a fallback queue for manual processing.

### 3.7 Observability Module

The observability module provisions a CloudWatch dashboard with four widgets (ingestion throughput, classification latency P95, action success rate, and error count by module), metric alarms for error rates exceeding 5%, latency exceeding 30 seconds, API throttling, and DynamoDB read/write capacity alerts. An SNS topic delivers alarm notifications to the operations team.

---

## 4. Security Invariants Enforced by Infrastructure

A security invariant is a property that must hold true across all system states. In application-level enforcement, invariants are maintained by code logic that can be circumvented through bugs, misconfigurations, or compromises. In infrastructure-level enforcement, invariants are guaranteed by the topology and policy of the underlying cloud resources.

**Table 2.** Security invariants mapped to Terraform resources and STRIDE threats mitigated.

| # | Security Invariant | Terraform Resource(s) | STRIDE Threat |
|---|---|---|---|
| SI-1 | Lambda egress restricted to HTTPS (443) via NAT gateway; AWS service traffic via VPC endpoints | VPC private subnets, NAT gateway, Lambda SG egress rule (443 only), VPC endpoints for DynamoDB/Secrets Manager/Bedrock/EventBridge | T8: Elevation of Privilege, T6: Information Disclosure |
| SI-2 | All Lambda functions execute within VPC | `vpc_config` block on every `aws_lambda_function` | T8: Elevation of Privilege |
| SI-3 | No IAM role can assume other roles | Permission boundary with explicit `sts:AssumeRole` deny | T8: Elevation of Privilege |
| SI-4 | No IAM role can modify IAM policies | Permission boundary with explicit `iam:*Policy*` deny | T8: Elevation of Privilege |
| SI-5 | All DynamoDB tables encrypted at rest | `server_side_encryption { enabled = true }` on every table | T6: Information Disclosure |
| SI-6 | All DynamoDB tables have PITR enabled | `point_in_time_recovery { enabled = true }` on every table | T4: Tampering |
| SI-7 | Audit logs cannot be deleted via API | No `dynamodb:DeleteItem` permission on audit table in any role | T5: Repudiation |
| SI-8 | CloudTrail logs forwarded to write-only bucket | S3 bucket policy denying `s3:DeleteObject`, versioning enabled | T5: Repudiation |
| SI-9 | All webhook sources validated via HMAC-SHA256 | Ingestion Lambda code + per-source secrets in Secrets Manager | T1: Spoofing |
| SI-10 | Webhook replay prevented within 5-minute window | Ingestion Lambda timestamp validation + DynamoDB dedup with TTL | T9: Replay |
| SI-11 | API Gateway dashboard routes require OKTA JWT | `aws_apigatewayv2_authorizer` with OKTA JWKS endpoint | T1: Spoofing |
| SI-12 | Secrets rotate automatically | Secrets Manager rotation Lambda with 30-day schedule | T2: Token Theft |
| SI-13 | Each integration uses dedicated OKTA service account | Separate `aws_secretsmanager_secret` per integration target | T3: Lateral Movement |
| SI-14 | Bedrock prompts cannot be modified via API | System prompt hardcoded in Lambda source, not in DynamoDB | T3: Prompt Injection |

Invariants SI-1 through SI-4 are enforced by the foundation module and cannot be overridden by any other module — the VPC topology, security group rules, and permission boundary apply to all resources created within the account. SI-1 is noteworthy: Lambda functions require NAT gateway egress for external API calls (OKTA, ServiceNow, PagerDuty), but the security group restricts egress to HTTPS (port 443) only, and AWS service traffic bypasses the NAT entirely via four VPC endpoints. This is a stronger guarantee than application-level enforcement, where a new Lambda function could accidentally be deployed outside the VPC or without the permission boundary.

Invariants SI-5 through SI-8 protect data integrity and auditability. PITR enables point-in-time recovery of any DynamoDB table to any second within the last 35 days, providing a governance safety net against both accidental and malicious data modification.

Invariants SI-9 through SI-14 protect the ingestion and classification pipeline against the six STRIDE threat categories. Notably, SI-14 (prompt template immutability) is an architectural decision with infrastructure consequences: because the system prompt is embedded in the Lambda deployment package rather than stored in a configurable database, modifying the prompt requires a code change, a build, and a Terraform deployment — all of which flow through version control and peer review.

---

## 5. Maturity Model as Infrastructure Configuration

### 5.1 Four-Level Progressive Autonomy

The ZTAIT governance maturity model defines four levels of progressive agent autonomy, each with quantitative entry and exit criteria:

**Level 0 — Shadow Mode.** The agent classifies events in parallel with human operators. Results are logged but the agent takes no actions. Exit criteria: agreement rate of 85% or higher with human decisions over 30 days on at least 200 incidents, average confidence of 0.75 or higher.

**Level 1 — Assisted Mode.** Classifications and recommended actions are displayed to operators, who approve, modify, or reject each recommendation. Exit criteria: human override rate of 15% or lower over 30 days, no P1/P2 misclassification.

**Level 2 — Supervised Mode.** Autonomous execution for P3/P4 incidents. Gated execution for P1/P2 (requires human approval). Exit criteria: P1/P2 approval rate of 95% or higher, zero false-positive MIM declarations.

**Level 3 — Autonomous Mode.** Full autonomous execution for all severity levels. Human role shifts to post-action review. Ongoing requirement: accuracy of 95% or higher. Automatic regression to L2 if accuracy drops below 90% for 7 consecutive days.

### 5.2 Infrastructure-Controlled Transitions

The maturity level is controlled through Terraform variables that propagate to Lambda environment variables, gating rule configurations, and CloudWatch alarm thresholds. A level transition requires changing the `maturity_level` variable in the Terraform configuration, running `terraform plan` to preview the infrastructure changes, and applying with `terraform apply`.

**Table 3.** Infrastructure configuration changes per maturity level.

| Configuration | L0: Shadow | L1: Assisted | L2: Supervised | L3: Autonomous |
|---|---|---|---|---|
| `action_execution_enabled` | `false` | `false` | `true` | `true` |
| `gating_required_p1_p2` | N/A | `true` | `true` | `false` |
| `gating_required_p3_p4` | N/A | `true` | `false` | `false` |
| `display_recommendations` | `false` | `true` | `true` | `true` |
| `auto_regression_enabled` | `false` | `false` | `true` | `true` |
| `accuracy_threshold` | N/A | N/A | `0.90` | `0.95` |
| `min_confidence_auto` | N/A | N/A | `0.85` | `0.80` |

This approach provides two governance advantages:

1. **Change Auditability.** Every maturity level transition is a Terraform configuration change that flows through version control. The Git commit history records who authorized the transition, when, and the exact configuration delta.

2. **Rollback Safety.** If the agent underperforms at a higher maturity level, reverting to the previous level is a `terraform apply` with the prior configuration — the infrastructure returns to its previous state deterministically. Automatic regression (triggered by accuracy dropping below threshold) is implemented as a CloudWatch alarm that invokes a Lambda function to update the maturity level in the system settings table, which the action execution Lambdas read on each invocation.

---

## 6. Evaluation

### 6.1 NIST SP 800-207 Compliance Assessment

NIST SP 800-207 (Rose et al., 2020) defines seven tenets of Zero Trust Architecture. We evaluate the reference architecture against each tenet.

**Table 4.** NIST SP 800-207 tenet mapping to architecture components.

| NIST ZTA Tenet | Architecture Implementation |
|---|---|
| 1. All data sources and computing services are considered resources | Each Lambda function, DynamoDB table, and EventBridge bus is a named Terraform resource with explicit configuration |
| 2. All communication is secured regardless of network location | VPC-internal communication only; API Gateway with TLS termination; OKTA JWT on dashboard routes; HMAC-SHA256 on webhooks |
| 3. Access to individual enterprise resources is granted on a per-session basis | 15-minute JWT token TTL; per-request HMAC validation; no persistent sessions between pipeline stages |
| 4. Access is determined by dynamic policy | Trust score T(i) dynamically adjusts action permissions based on model confidence, behavioral consistency, historical accuracy, and environmental context |
| 5. Enterprise monitors and measures integrity and security posture | CloudWatch dashboards, metric alarms, guardrail trigger rate monitoring, confidence drift detection |
| 6. All resource authentication and authorization is dynamic and strictly enforced | OKTA JWT tokens validated at API Gateway before Lambda invocation; IAM roles evaluated at every AWS API call; permission boundaries enforced at every role assumption |
| 7. Enterprise collects information about the current state of assets | DynamoDB event source table with heartbeat tracking; CloudWatch metrics on all Lambda functions; CloudTrail logging all API calls |

The architecture satisfies all seven tenets. Tenet 4 (dynamic policy) is the most novel application: the trust scoring engine uses real-time signals (model confidence, environmental context) to gate autonomous action execution, implementing zero-trust principles at the AI decision layer rather than only at the network or identity layer.

### 6.2 Comparative Analysis

We evaluate the architecture against six existing AI agent governance frameworks across ten capability dimensions.

**Table 5.** Comparative analysis across ten governance capability dimensions.

| Dimension | NIST AI RMF | ISO 42001 | CSA ZT-IAM | OWASP Agentic | Acuvity AIF | Palo Alto EAAGF | **This Work** |
|---|---|---|---|---|---|---|---|
| Agent-Specific Controls | No | No | Yes | Yes | Yes | Yes | **Yes** |
| Governance Maturity Model | No | Partial | No | No | Yes (security) | No | **Yes (full lifecycle)** |
| Zero-Trust Identity | No | No | Yes | Partial | Partial | Partial | **Yes** |
| Quantitative Trust Scoring | No | No | Partial | No | No | No | **Yes** |
| Prompt Injection Defense | No | No | No | Listed | No | No | **Yes (5-layer)** |
| Reference Implementation | No | No | No | No | No | No | **Yes (complete)** |
| Deterministic Policy Engine | No | No | No | No | No | No | **Yes** |
| STRIDE Threat Model | No | No | Partial | Yes | No | Partial | **Yes (14 threats)** |
| Compliance Mapping | Yes | Yes | Partial | No | No | No | **Yes** |
| Enterprise Integration | No | No | Partial | No | No | No | **Yes** |

The architecture achieves coverage across all ten dimensions. No other surveyed framework covers more than four. We acknowledge that these frameworks serve different purposes and audiences — NIST AI RMF and ISO 42001 are organizational-level governance standards, not infrastructure specifications. The comparison demonstrates the complementary nature of infrastructure-level governance enforcement rather than a replacement for organizational governance.

### 6.3 Deployment Validation

The reference architecture was deployed on AWS to validate that the Terraform configuration produces a functional infrastructure. Key deployment metrics:

- **Total Terraform resources managed:** 47
- **Total HCL lines across five modules:** 1,131
- **Deployment time (initial `terraform apply`):** Approximately 8 minutes
- **VPC configuration:** 3 Availability Zones, 6 subnets (3 private, 3 public), 2 VPC endpoints
- **Lambda functions deployed:** 7 (webhook receiver, triage engine, 4 action handlers, config manager)
- **DynamoDB tables created:** 7 (incidents, audit, policies, sources, settings, escalation rules, deduplication)
- **IAM roles created:** 7 (one per Lambda function) with shared permission boundary
- **CloudWatch alarms configured:** 5 (error rate, latency P95, throttling, DynamoDB read capacity, DynamoDB write capacity)

No manual console operations were required after `terraform apply`. All resources were created in the correct VPC, with the correct IAM roles, and with the correct security configurations as specified in the Terraform modules.

---

## 7. Discussion

### 7.1 Infrastructure-Level vs. Application-Level Governance

The central argument of this paper is that security and governance properties for autonomous AI agents should be enforced at the infrastructure layer whenever possible. This position is motivated by three observations:

First, infrastructure-level enforcement is *architecturally guaranteed*. When SI-1 (egress restricted to HTTPS via NAT) is enforced by the Lambda security group allowing only port 443 egress and VPC endpoints routing AWS service traffic internally, no application code — regardless of bugs, misconfigurations, or compromises — can open additional egress ports or bypass the NAT gateway. The guarantee derives from network topology and security group policy, not code correctness.

Second, infrastructure-level enforcement is *declaratively auditable*. A reviewer can inspect the Terraform configuration and verify that SI-3 (no role can assume other roles) is enforced by examining the permission boundary policy. This verification requires no dynamic testing, no code execution, and no understanding of the application's business logic.

Third, infrastructure-level enforcement *prevents configuration drift*. The Terraform state model detects and can automatically correct manual changes that would weaken security invariants. Application-level controls that depend on environment variables, runtime configuration, or database-stored policies can drift without detection.

However, not all governance properties can be enforced at the infrastructure layer. SI-14 (prompt immutability) is partially infrastructure-enforced — the prompt is in Lambda source code, making modification require a deployment pipeline — but the prompt's *content* is an application concern. Similarly, the trust scoring engine's weight calibration, the suppression rule regex patterns, and the escalation rule priority ordering are inherently application-level concerns that infrastructure cannot and should not dictate.

We propose a *governance enforcement hierarchy*: enforce at the infrastructure layer first, at the application layer second, and through organizational policy only when neither technical enforcement is feasible.

### 7.2 Lessons Learned

**Module boundaries matter for governance.** Decomposing the architecture into modules aligned with governance responsibilities (rather than technical capabilities) made invariant enforcement clearer. The foundation module owns all cross-cutting security resources, ensuring that no downstream module can weaken the security posture.

**Permission boundaries are the single most important Terraform resource for AI agent governance.** The system-wide permission boundary reduces the blast radius of any single compromised Lambda function from "full AWS account access" to "access only to ztait-prefixed resources, with no ability to escalate privileges."

**Terraform variables as governance controls require organizational discipline.** While the maturity level is controlled through Terraform variables (Section 5.2), the transition from L2 to L3 (full autonomous execution) is a consequential decision that should require governance board approval — enforced through pull request review policies, not through Terraform alone.

### 7.3 Limitations

**Cloud Provider Coupling.** The reference architecture uses AWS services exclusively. While the design principles and module decomposition are cloud-agnostic, the Terraform resource declarations are AWS-specific. Adapting the architecture for Azure (using Azure Functions, Cosmos DB, Azure AD) or GCP (using Cloud Functions, Firestore, Google Cloud IAM) requires rewriting the HCL while preserving the invariant mappings.

**Single-Agent Focus.** The architecture governs a single autonomous agent. Multi-agent orchestration, inter-agent trust, and collective decision-making would require additional infrastructure patterns (shared event buses, cross-account IAM trust relationships) that are not addressed.

**No Empirical User Study.** The architecture has been validated through deployment but not through controlled experiments with enterprise operations teams. Measuring the impact of infrastructure-level governance on operator trust, incident response time, and governance compliance requires longitudinal studies in production environments.

**Domain Specificity.** The architecture is designed for incident triage. Extending it to other agent domains (code generation, customer service, financial trading) would require domain-specific adaptations to the decision pipeline, trust scoring factors, and policy engine rules, though the infrastructure modules and security invariants would largely transfer.

**Trust Score Validation.** The trust scoring weights (w₁ = 0.50, w₂ = 0.15, w₃ = 0.25, w₄ = 0.10) are theoretically motivated and calibrated during shadow mode. Long-term empirical validation across diverse enterprise environments is needed to confirm optimal weight distributions.

### 7.4 Future Work

**Multi-Cloud Portability.** Developing equivalent Terraform modules for Azure and GCP while maintaining invariant coverage, using Terraform provider abstraction where possible and documenting provider-specific adaptations.

**Policy-as-Code Integration.** Integrating HashiCorp Sentinel or Open Policy Agent (OPA) to enforce Terraform configuration policies (e.g., "every Lambda function must have a `vpc_config` block") as part of the CI/CD pipeline, adding a *preventive* layer to the *detective* layer provided by Terraform state drift detection.

**Multi-Agent Governance.** Extending the architecture for multi-agent systems where agents collaborate, delegate, and potentially conflict, building on emerging standards such as Anthropic's Model Context Protocol and Google's Agent2Agent Protocol.

**Empirical Evaluation.** Conducting controlled experiments with enterprise operations teams to measure the impact of infrastructure-level governance on operator trust, Mean Time to Detect, Mean Time to Respond, and false positive rates across different maturity levels.

**Automated Maturity Advancement.** Replacing the governance board approval requirement for level transitions with a fully automated advancement system driven by CloudWatch metrics and verified by the trust scoring engine.

---

## 8. Conclusions

We presented a modular Infrastructure as Code reference architecture for governing autonomous AI agents in enterprise incident response. The architecture, implemented in Terraform across five modules totaling 1,131 lines of HCL, demonstrates that enterprise-grade AI agent governance can be enforced declaratively at the infrastructure layer rather than programmatically at the application layer.

The key insight is that security invariants enforced by infrastructure topology and cloud provider policy mechanisms (VPC routing, IAM permission boundaries, KMS encryption) provide stronger guarantees than application-level enforcement, because they cannot be circumvented by code defects, misconfigurations, or compromised dependencies. We identified 14 security invariants and mapped each to specific Terraform resource declarations, showing how governance properties emerge from infrastructure design decisions.

The four-level maturity model — controlled entirely through Terraform configuration variables — enables organizations to adopt AI agent autonomy incrementally, with each transition recorded in version control, peer-reviewed through standard merge workflows, and reversible through infrastructure state management. This approach transforms governance transitions from high-risk operational decisions into auditable, repeatable infrastructure changes.

The reference architecture achieves coverage across all ten governance capability dimensions evaluated in the comparative analysis. To our knowledge, it is among the first to provide a complete, deployable IaC implementation for AI agent governance, complementing existing organizational-level frameworks (NIST AI RMF, ISO 42001) with infrastructure-level enforcement mechanisms.

As enterprises accelerate autonomous AI agent deployment across critical workflows, the infrastructure through which these agents are deployed becomes a governance enforcement surface of equal importance to the organizational policies that guide them. This work provides a practical, immediately deployable foundation for that infrastructure-level governance.

---

## Data and Code Availability

The reference implementation source code (Terraform modules, Lambda function code, React governance dashboard) is available at [repository URL]. A DOI for the archived version will be provided upon acceptance via Zenodo.

---

## AI Use Disclosure

Generative AI tools were used for drafting assistance and editorial refinement during manuscript preparation. All technical content, architecture decisions, Terraform implementations, security invariant analysis, and evaluation methodology represent the original work of the authors. AI tools were not used to generate data, figures, code, or reference lists.

---

## Funding Statement

[To be completed by authors]

---

## Competing Interests

The authors declare no competing interests.

---

## Author Contributions

[To be completed by authors — e.g., "Conceived and designed the framework: [Author]. Implemented the reference architecture: [Author]. Performed the evaluation: [Author]. Wrote the paper: [Author]."]

---

## References

Acuvity. (2025). Agent Integrity Framework: A Five-Level Maturity Model for Agent Security. Version 1.0.

Cloud Security Alliance. (2025a). Zero-Trust IAM Framework for Agentic AI. CSA AI Safety Initiative.

Cloud Security Alliance. (2025b). MAESTRO: Multi-Agent Environment Security Threat and Risk Ontology. CSA Research.

Gartner. (2025). Alert Fatigue and the Cost of Manual Triage in Enterprise IT Operations. Gartner Research Note, Stamford, CT.

HashiCorp. (2025). State of Cloud Strategy Survey. HashiCorp, San Francisco, CA.

ISO/IEC. (2023). ISO/IEC 42001:2023 — Information technology — Artificial intelligence — Management system. International Organization for Standardization, Geneva, Switzerland.

McKinsey & Company. (2025a). The AI-Native SOC: How Foundation Models Are Transforming Incident Response. McKinsey Digital Insights, New York, NY.

McKinsey & Company. (2025b). Agentic AI Security Playbook for Enterprises. McKinsey Digital.

Narajala, V.S., Rao, P. et al. (2025). A Novel Zero-Trust Identity Framework for Agentic AI. arXiv:2505.19301.

NIST. (2023a). Artificial Intelligence Risk Management Framework (AI RMF 1.0). NIST AI 100-1, National Institute of Standards and Technology, Gaithersburg, MD. doi: 10.6028/NIST.AI.100-1.

NIST. (2025). Request for Information on AI Agent Security and Governance. Federal Register.

Opdebeeck, R., De Roover, C. & De Meuter, W. (2022). Smelly Variables in Ansible Infrastructure Code: Detection, Prevalence, and Lifetime. In Proceedings of the 19th International Conference on Mining Software Repositories (MSR '22). ACM. doi: 10.1145/3524842.3527960.

OWASP. (2025). OWASP Top 10 for Agentic AI Security. OWASP Foundation.

Palo Alto Networks. (2025). Agentic AI Governance: Managing Delegated Authority in Autonomous Systems. Palo Alto Networks Whitepaper.

Rahman, A., Parnin, C. & Williams, L. (2021). The Seven Sins: Security Smells in Infrastructure as Code Scripts. IEEE Transactions on Software Engineering, 47(1), 24–47. doi: 10.1109/TSE.2019.2901217.

Rose, S., Borchert, O., Mitchell, S. & Connelly, S. (2020). Zero Trust Architecture. NIST Special Publication 800-207, National Institute of Standards and Technology, Gaithersburg, MD. doi: 10.6028/NIST.SP.800-207.

ZTAIT Framework. (2026). Zero-Trust Autonomous Incident Triage Framework Specification. Version 1.0. Available: [repository URL].
