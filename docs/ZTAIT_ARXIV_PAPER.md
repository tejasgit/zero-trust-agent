# ZTAIT: A Zero-Trust Framework for Governing Autonomous AI Agents in Enterprise Incident Response

**Authors:** [Author Names]

**Affiliations:** [Affiliations]

**Submitted to:** arXiv (cs.CR, cs.AI)

**Date:** February 18, 2026

---

## Abstract

Autonomous AI agents are increasingly deployed in enterprise incident response pipelines, where they classify alerts, escalate incidents, and orchestrate Major Incident Management (MIM) processes. However, existing governance frameworks — designed for static AI model outputs — fail to address the unique security and trust challenges of agents that take autonomous actions in critical infrastructure. We present ZTAIT (Zero-Trust Autonomous Incident Triage), a comprehensive framework that unifies AI agent governance, zero-trust identity management, and deterministic policy enforcement into a single coherent architecture. ZTAIT introduces four key contributions: (1) a four-level maturity model for progressive agent autonomy with quantitative advancement criteria, (2) a composite trust scoring engine that dynamically adjusts agent authority based on model confidence, behavioral consistency, historical accuracy, and environmental context, (3) a five-layer prompt injection defense stack designed for AI agents processing untrusted external input, and (4) a deterministic policy engine that constrains non-deterministic AI outputs within auditable governance boundaries. We accompany the framework with a complete reference implementation comprising Terraform Infrastructure-as-Code for AWS (VPC, IAM, DynamoDB, Lambda, EventBridge, Bedrock, CloudWatch), a React governance dashboard deployable on Cloudflare Pages, and integration adapters for ServiceNow, PagerDuty, Slack, and MIM systems. We analyze ZTAIT against a STRIDE threat model identifying 14 distinct threats, map its controls to compliance requirements from NIST AI RMF, NIST SP 800-207, ISO 42001, SOC 2, and OWASP Agentic AI Top 10, and conduct a comparative analysis showing that ZTAIT is, to our knowledge, among the first frameworks to integrate governance maturity modeling, zero-trust agent identity, quantitative trust scoring, and a working reference implementation in a single specification. The framework addresses the critical gap identified by CSA, OWASP, and recent academic work: that effective autonomous agent governance requires the integration of organizational controls with technical security enforcement through a unified trust lifecycle.

**Keywords:** Zero Trust, AI Agent Governance, Autonomous Incident Response, Prompt Injection Defense, Trust Scoring, Enterprise AI Security, Large Language Models, AWS Bedrock

**ACM CCS:** Security and privacy → Access control; Computing methodologies → Artificial intelligence; Software and its engineering → Software safety

---

## 1. Introduction

The proliferation of monitoring tools in enterprise environments has created an alert volume crisis. Large enterprises routinely generate tens of thousands of monitoring alerts daily across observability platforms (New Relic, Datadog, Splunk), cloud provider health APIs (AWS CloudWatch, Azure Monitor), ITSM systems (ServiceNow, Jira), and business application events (Salesforce, SAP). Manual triage of this volume is increasingly unsustainable: industry surveys report that Level-1 engineers spend a majority of their time on alert noise rather than incident resolution [1], and Mean Time to Detect (MTTD) for critical incidents remains measured in hours rather than minutes [2].

The introduction of Large Language Models (LLMs) as autonomous triage agents offers a promising solution. An LLM-powered agent can classify alerts by correlating signals across monitoring systems, assess blast radius and revenue impact, and execute escalation actions — creating ServiceNow incidents, paging on-call engineers, and declaring Major Incidents — in seconds rather than the minutes or hours required for manual triage.

However, deploying an autonomous AI agent with write access to production incident management systems introduces unprecedented governance and security challenges that existing frameworks fail to address:

**Challenge 1: Trust Verification.** When an AI agent classifies an alert as a P1 production outage and pages 50 engineers, how can the organization verify this classification is correct *before* the action executes? The agent's confidence score provides a signal, but confidence alone is insufficient — models can be confidently wrong, especially when encountering novel failure modes or adversarial input.

**Challenge 2: Accountability and Auditability.** When an AI agent suppresses a legitimate P1 alert or triggers a false Major Incident, who is accountable? The operator who configured the rules? The engineer who deployed the model? The vendor who trained the foundation model? Existing AI governance frameworks focus on model-level accountability but provide no mechanism for attributing responsibility in a multi-component autonomous pipeline.

**Challenge 3: Adversarial Security.** An AI agent that processes untrusted input from external monitoring systems and has write access to ServiceNow, PagerDuty, and incident bridges becomes a high-value target. Prompt injection via alert payloads, webhook spoofing, credential theft, and lateral movement through over-privileged service accounts are realistic attack vectors that traditional perimeter security does not address.

**Challenge 4: Governance Gap.** The dominant AI governance frameworks — NIST AI RMF [3], ISO/IEC 42001 [4] — were designed for model outputs, not autonomous agent actions. As Palo Alto Networks observes, "most AI governance programs were designed for model outputs, not autonomous actions" [5]. These frameworks provide high-level principles (fairness, transparency, accountability) but offer no operational guidance for constraining an AI agent's real-time decision-making within auditable governance boundaries.

### 1.1 Contribution

We present ZTAIT (Zero-Trust Autonomous Incident Triage), a framework that addresses these four challenges by unifying three historically separate disciplines:

1. **Enterprise AI Agent Governance** — maturity models, layered controls, oversight triggers, risk scoring — drawn from the EAAGF tradition [5, 6, 7].
2. **Zero-Trust Agent Identity and Access Management** — agent identity lifecycle, fine-grained access control, continuous behavioral trust evaluation — drawn from the ZTA tradition [8, 9, 10].
3. **Enterprise Incident Management** — ITIL-aligned triage, escalation, MIM declaration, integration with ServiceNow/PagerDuty/Slack — drawn from operational practice.

ZTAIT makes four specific contributions:

- **C1**: A four-level maturity model (L0: Shadow → L1: Assisted → L2: Supervised → L3: Autonomous) with quantitative entry/exit criteria and automatic regression on accuracy degradation (Section 4.1).
- **C2**: A composite trust scoring engine T = w₁C + w₂B + w₃H + w₄E combining model confidence (C), behavioral consistency (B), historical accuracy (H), and environmental context (E) to dynamically gate agent actions (Section 4.3).
- **C3**: A five-layer prompt injection defense stack specifically designed for AI agents processing untrusted input from external monitoring systems, extending beyond the pattern-matching approaches in OWASP Agentic AI Top 10 [11] (Section 5).
- **C4**: A deterministic policy engine (escalation rules, gating rules, suppression rules, decision matrix) that constrains the AI model's non-deterministic outputs within an auditable, human-configurable action space — implementing Principle P7: "Deterministic Constraints on Non-Deterministic AI" (Section 4.4).

Additionally, we provide a complete reference implementation (Section 6) that enables immediate adoption, differentiating ZTAIT from theoretical frameworks that lack operational guidance.

### 1.2 Paper Organization

Section 2 reviews related work across AI governance, zero-trust security, and agent security. Section 3 defines ZTAIT's core principles. Section 4 presents the framework architecture. Section 5 details the security analysis and threat model. Section 6 describes the reference implementation. Section 7 evaluates ZTAIT through comparative analysis. Section 8 discusses limitations and future work. Section 9 concludes.

---

## 2. Related Work

### 2.1 AI Governance Frameworks

**NIST AI Risk Management Framework (AI RMF 1.0)** [3] provides a voluntary framework organized around four functions: GOVERN, MAP, MEASURE, and MANAGE. While comprehensive for AI system lifecycle management, AI RMF does not address the unique challenges of autonomous agents — real-time action constraints, progressive autonomy models, or agent-specific threat vectors. ZTAIT extends AI RMF's MANAGE function with operational controls (gating rules, circuit breakers) and its MEASURE function with quantitative trust scoring.

**ISO/IEC 42001:2023** [4] establishes requirements for an AI Management System (AIMS). Like AI RMF, it provides organizational-level guidance but does not address agent-level controls. ZTAIT's maturity model maps to ISO 42001's management system structure while adding agent-specific depth.

**Emerging Agent Governance**: Palo Alto Networks defines agentic AI governance as "the structured management of delegated authority in autonomous AI systems" [5], emphasizing the shift from governing model outputs to governing agent actions. McKinsey's Agentic AI Security Playbook [6] calls for "standardized oversight processes, defined accountability for agent actions, and triggers for escalation." These industry perspectives validate ZTAIT's approach but remain at the conceptual level without implementation guidance.

### 2.2 Zero-Trust Architecture for Agents

**NIST SP 800-207** [8] defines Zero Trust Architecture (ZTA) for enterprise networks. Its core principles — never trust/always verify, least privilege, micro-segmentation — are directly applicable to AI agent ecosystems but require extension to address agent-specific concerns: model confidence as a trust signal, prompt injection as an attack vector, and behavioral consistency as a continuous verification mechanism.

**Cloud Security Alliance Zero-Trust IAM for Agents** [9]: CSA's AI Safety Initiative proposed a zero-trust IAM framework using Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs) for agent identity. Their architecture includes an Agent Name Service for discovery, just-in-time access tokens, and continuous trust scoring. While conceptually aligned with ZTAIT's identity architecture, CSA's proposal remains theoretical without a reference implementation or detailed threat model.

**Huang et al. (2025)** [10] presented a novel agentic AI IAM framework on arXiv using DIDs/VCs, fine-grained access control, unified session management, and zero-knowledge proofs for policy compliance. Their work addresses cross-organizational agent trust — a dimension ZTAIT acknowledges but defers to emerging standards (Anthropic MCP [12], Google Agent2Agent [13]).

**Okta's Non-Human Identity Guidance** [14] advocates treating "every agent as a first-class identity" with micro-segmented permissions, short-lived credentials, and per-request verification. ZTAIT operationalizes this guidance through per-Lambda IAM roles, per-integration OKTA service accounts, and 15-minute JWT token TTLs.

### 2.3 Agent Security

**OWASP Top 10 for Agentic AI Security** [11] identifies the primary security risks for AI agents, including prompt injection, excessive agency, insecure output handling, and over-reliance on model outputs. ZTAIT provides concrete mitigations for each: a five-layer prompt injection defense, permission boundaries limiting agency, Zod schema validation on outputs, and human-in-the-loop gating.

**Acuvity's Agent Integrity Framework** [15] defines five maturity levels focused on security controls, including "continuous verification at the semantic level" — confirming an agent *should* take an action, not just that it *can*. ZTAIT extends this concept through its trust scoring engine, which combines semantic verification (behavioral consistency) with quantitative signals (historical accuracy, environmental context).

**AGENTSAFE** [16] evaluates safety in multi-agent systems, focusing on inter-agent communication risks. **Fortifying Agentic Web Systems** [17] addresses prompt injection in web-connected agents. Both inform ZTAIT's threat model but focus on multi-agent scenarios rather than enterprise incident response governance.

**CSA MAESTRO** [18] provides a Multi-Agent Environment Security Threat and Risk Ontology. While MAESTRO maps threats in multi-agent systems broadly, ZTAIT applies STRIDE threat modeling specifically to the incident triage domain, identifying 14 concrete threats with dual mitigations for each.

### 2.4 Gap Analysis

Table 1 summarizes the gap that ZTAIT fills:

| Capability | NIST AI RMF | ISO 42001 | CSA ZT-IAM | OWASP Agentic | Acuvity AIF | **ZTAIT** |
|---|---|---|---|---|---|---|
| Agent-Specific Controls | — | — | ✓ | ✓ | ✓ | **✓** |
| Governance Maturity Model | — | Partial | — | — | ✓ (security) | **✓ (comprehensive)** |
| Zero-Trust Identity | — | — | ✓ | Partial | Partial | **✓** |
| Quantitative Trust Scoring | — | — | Partial | — | — | **✓** |
| Prompt Injection Defense | — | — | — | ✓ (listed) | — | **✓ (5-layer)** |
| Reference Implementation | — | — | — | — | — | **✓** |
| Deterministic Policy Engine | — | — | — | — | — | **✓** |
| STRIDE Threat Model | — | — | Partial | ✓ | — | **✓ (14 threats)** |

No existing framework that we have identified combines all eight capabilities. To our knowledge, ZTAIT is among the first frameworks to integrate governance maturity modeling, zero-trust agent identity, quantitative trust scoring, prompt injection defense, deterministic policy enforcement, and a working reference implementation in a single specification. We acknowledge that the rapidly evolving nature of this field means concurrent efforts may address similar gaps.

---

## 3. Core Principles

ZTAIT is built on seven core principles that govern every architectural and operational decision:

**P1. Never Trust, Always Verify.** Every request — from external webhooks, dashboard operators, and the AI agent itself — is authenticated and authorized at every boundary. No implicit trust exists between components.

**P2. Fail Closed.** When any component fails — authentication, classification, action execution — the system defaults to the most restrictive behavior: human review. This is the operational manifestation of zero-trust for AI agents.

**P3. Least Privilege, Narrowest Scope.** Every identity (human, service, compute, AI model) receives only the minimum permissions required for its specific function, scoped to the narrowest possible resource set. Implemented through per-Lambda IAM roles, per-integration service accounts, and a system-wide permission boundary that denies destructive actions.

**P4. Complete Auditability.** Every decision — ingestion, classification, suppression, action execution, rule change, human override — is recorded with the actor's identity, timestamp, reasoning, and correlation ID. No decision is unreconstructable.

**P5. Progressive Autonomy.** Agent autonomy increases only as organizational trust is earned through demonstrated accuracy, not through configuration alone. Each maturity level has measurable entry criteria and automatic regression on accuracy degradation.

**P6. Defense in Depth.** Every threat in the STRIDE model has at least two independent mitigations at different architectural layers.

**P7. Deterministic Constraints on Non-Deterministic AI.** The AI model's outputs are constrained by deterministic policy rules that humans can understand, audit, and modify. The AI recommends; the policy engine decides.

---

## 4. Framework Architecture

### 4.1 Governance Maturity Model

ZTAIT defines four maturity levels representing progressive agent autonomy:

**Level 0 — Shadow Mode:** The agent classifies events in parallel with human operators. Results are logged but not visible to operators (preventing confirmation bias). The agent takes no actions. Entry: framework deployed. Exit: ≥85% agreement with human decisions over 30 days on ≥200 incidents, average confidence ≥0.75.

**Level 1 — Assisted Mode:** Classifications and recommended actions are displayed to operators, who approve, modify, or reject each recommendation. Entry: L0 exit criteria met, governance board approval. Exit: human override rate ≤15% over 30 days, no P1/P2 misclassification, mean recommendation latency <60s.

**Level 2 — Supervised Mode:** Autonomous execution for P3/P4 incidents. Gated execution for P1/P2 (requires human approval). Entry: L1 exit criteria met, P3/P4 accuracy ≥90%, gating rules configured. Exit: P1/P2 approval rate ≥95%, zero false-positive MIM declarations, P3/P4 accuracy ≥95%.

**Level 3 — Autonomous Mode:** Full autonomous execution for all severity levels. Human role shifts to post-action review and anomaly investigation. Entry: L2 exit criteria met, executive approval. Ongoing: accuracy ≥95%, confidence ≥0.80 average. Automatic regression to L2 if accuracy drops below 90% for 7 consecutive days.

The regression policy ensures that trust is earned and maintained: a critical security event (prompt injection detected, unauthorized action) triggers immediate regression to L0 with mandatory security review.

### 4.2 Decision Pipeline

ZTAIT implements a four-stage event-driven pipeline:

**Stage 1: Ingestion.** Webhook receiver validates HMAC-SHA256 signatures, normalizes payloads to a canonical schema, deduplicates via DynamoDB conditional writes (24-hour TTL), and evaluates suppression rules. Security controls: anti-replay (5-minute timestamp window), WAF, rate limiting (100 req/sec/source).

**Stage 2: Enrichment.** Context enricher augments events with ServiceNow incident history, Splunk signals, and New Relic entity health. Each source operates independently with circuit breaker protection — enrichment failure does not block triage.

**Stage 3: AI Classification.** AWS Bedrock (Claude Sonnet 4.5) classifies the enriched event within a five-layer prompt injection defense stack. Output is schema-validated (severity enum, confidence range, action enum) with confidence thresholds enforcing human review.

**Stage 4: Action Execution.** Policy engine evaluates escalation rules (priority-ordered, first match wins), checks gating rules for each matched action, and executes via OKTA-authenticated REST calls with per-action idempotency keys and per-integration circuit breakers.

### 4.3 Trust Scoring Engine

The trust score T determines whether an action executes autonomously, is gated for human approval, or is suppressed. We define T as a weighted linear combination of four normalized factors:

**Definition 1 (Trust Score).** For an incident i with source s and AI classification c, the trust score is:

T(i) = w₁·C(i) + w₂·B(i, s) + w₃·H(s, c) + w₄·E(i)

Subject to constraints:
- ∀ factor ∈ {C, B, H, E}: factor ∈ [0.0, 1.0]
- w₁ + w₂ + w₃ + w₄ = 1.0 (normalization constraint)
- ∀ wₖ ≥ 0 (non-negativity constraint)
- Therefore T(i) ∈ [0.0, 1.0]

**Factor Definitions:**

*C(i) — Model Confidence*: The AI model's self-assessed classification certainty, returned directly by the LLM as part of the structured output schema. Range [0.0, 1.0]. Note: C = 1.0 is treated as anomalous (Section 5.2, Layer 4) and triggers human review regardless of T.

*B(i, s) — Behavioral Consistency*: Measures how consistent this classification is with the agent's recent behavior for source s. Formally:

Let D(s) = {d₁, ..., dₙ} be the historical classification distribution for source s over a trailing 30-day window, where dⱼ represents the frequency of classification j (P1, P2, P3, P4, noise). Let c(i) be the classification of incident i. Then:

B(i, s) = D(s)[c(i)] / max(D(s))

If the classification c(i) has never been observed for source s, B = 0.3 (a configurable floor value reflecting maximum behavioral deviation). This factor detects anomalous classifications that may indicate model drift or adversarial manipulation.

*H(s, c) — Historical Accuracy*: The agent's trailing 30-day accuracy for the combination of source s and severity level c, computed as the ratio of correct classifications (validated by human review or incident resolution outcome) to total classifications:

H(s, c) = |correct classifications for (s, c) in 30d| / |total classifications for (s, c) in 30d|

If fewer than 10 samples exist for the (s, c) combination, H defaults to 0.5 (reflecting maximum uncertainty due to insufficient data).

*E(i) — Environmental Context*: A contextual modifier based on operational conditions at the time of classification:

E(i) = 1.0 (normal operations)
E(i) = 0.7 (during scheduled maintenance window for affected systems)
E(i) = 0.6 (during mass-failure event affecting >3 sources simultaneously)
E(i) = 0.8 (off-hours with reduced operator staffing)

These values are configurable via system settings and reflect the organization's risk tolerance in different operational contexts.

**Default Weights:** w₁ = 0.50, w₂ = 0.15, w₃ = 0.25, w₄ = 0.10. The rationale: model confidence (C) is the primary signal, historical accuracy (H) provides a strong corrective based on demonstrated performance, behavioral consistency (B) detects anomalies, and environmental context (E) provides situational awareness. Weights are initially set based on expert judgment and calibrated during L0 (Shadow Mode) by grid search over the weight space, minimizing the false positive rate (agent would execute an action that humans rejected) subject to maintaining a true positive rate ≥0.85.

**Decision Thresholds:** T ≥ 0.90 → auto-execute all matched actions; 0.70 ≤ T < 0.90 → auto-execute unless a gating rule applies; 0.50 ≤ T < 0.70 → force human review regardless of other rules; T < 0.50 → suppress and log for model tuning. These thresholds are configurable and may be adjusted per severity level (e.g., requiring T ≥ 0.95 for P1 auto-execution).

### 4.4 Deterministic Policy Engine

The policy engine implements four rule types that constrain the AI's action space:

**Escalation Rules** map classifications to actions with conditions on severity, source, and confidence range. Rules are evaluated in priority order; first match wins. This ensures deterministic, auditable action selection regardless of AI behavior.

**Gating Rules** intercept high-impact actions (MIM declaration, P1 paging) and require human approval when confidence is below a configured threshold. Gating rules include timeout handling: either auto-approve or auto-suppress after a configurable period.

**Suppression Rules** filter noise using regex patterns on source and title, with time-window support and automatic expiry dates. Suppressions are evaluated before triage to prevent wasting AI compute on known-benign events.

**Decision Matrix** provides a deterministic severity-to-action lookup (P1: INC+MIM+Page; P2: INC+Page; P3: INC only; P4: log only) that constrains the AI's recommended actions to a predefined, human-auditable space.

Principle P7 is enforced architecturally: the AI model cannot execute an action outside the decision matrix, cannot bypass a gating rule, and cannot override a suppression rule. The AI provides intelligence (severity, confidence, reasoning); the policy engine provides governance (constraints, approvals, audit).

---

## 5. Security Analysis

### 5.1 Threat Model (STRIDE)

We apply Microsoft's STRIDE methodology [19] to identify 14 threats across the triage pipeline (Table 2). Each threat has at least two independent mitigations at different architectural layers, satisfying Principle P6 (Defense in Depth).

**Spoofing (T1, T2, T9):** Webhook spoofing is mitigated by per-source HMAC-SHA256 validation and anti-replay timestamp checks. Token theft is mitigated by 15-minute TTL and certificate-based authentication. Webhook replay is mitigated by timestamp validation combined with DynamoDB deduplication with TTL.

**Tampering (T3, T4, T11, T12, T13):** Prompt injection (T3) receives the most extensive treatment through the five-layer defense stack (Section 5.2). Rule tampering (T4) is mitigated by OKTA JWT authentication on all config endpoints with complete audit trails and DynamoDB point-in-time recovery. Insider rule misuse (T11) is detected via rule change spike alerts and critical rule dual-approval requirements. Terraform state tampering (T12) is prevented by S3 versioning, KMS encryption, and DynamoDB state locking. Supply chain attacks (T13) are mitigated by minimal dependencies (AWS SDK v3 only) and committed lock files.

**Repudiation (T5):** Audit log deletion is prevented by CloudTrail forwarding to a write-only, versioned S3 bucket and by exposing no delete API on the audit DynamoDB table.

**Information Disclosure (T6, T10, T14):** PII in logs (T6) is mitigated by Bedrock Guardrails PII filtering and structured logging that excludes raw payloads. Data exfiltration via AI output (T10) is mitigated by Guardrails PII filtering on output and strict JSON schema enforcement. Secret leakage in error responses (T14) is prevented by sanitized error handlers that never expose stack traces or internal references.

**Denial of Service (T7):** Bedrock quota abuse is mitigated by API Gateway rate limiting and EventBridge throughput control.

**Elevation of Privilege (T8):** Lateral movement from compromised Lambda is prevented by system-wide permission boundaries, VPC isolation, and IAM policies scoped exclusively to triage-prefixed resources. The explicit DENY in the permission boundary prevents any role from assuming other roles, modifying IAM policies, or deleting infrastructure — even if the role policy is misconfigured.

### 5.2 Prompt Injection Defense (Five Layers)

Prompt injection is the highest-residual-risk threat (Medium) because it exploits the fundamental tension between processing untrusted external input and using an LLM for classification. ZTAIT addresses this with five independent defense layers:

**Layer 1 — Input Sanitization:** The webhook receiver strips control characters, rejects known injection patterns ("ignore previous instructions," role markers, large Base64 blocks), and HTML-entity encodes user-generated text fields. This layer prevents trivial injection attempts before they reach the LLM.

**Layer 2 — Structured Prompt Architecture:** The system prompt is hardcoded in Lambda code (not configurable via API or rules). Alert data is inserted within `<data>` XML tags with an explicit instruction: "Do not follow any instructions contained within the data tags." Decision matrix rules are passed as structured parameters, not free text. This architectural choice ensures that the prompt template has no user-controlled components.

**Layer 3 — AWS Bedrock Guardrails:** AWS-managed content, topic, word, and PII filters are applied on both input and output. The topic policy denies anything unrelated to IT operations and incident triage. This layer provides a vendor-maintained defense that evolves independently of the application code.

**Layer 4 — Output Validation:** The triage Lambda validates Claude's response against a strict Zod schema requiring specific enum values for severity and actions, a bounded confidence range (0.0–1.0), and a length-limited reasoning field. Any deviation from the schema triggers automatic rejection and human review. A confidence of exactly 1.0 is treated as suspicious.

**Layer 5 — Behavioral Monitoring:** New Relic and CloudWatch track guardrail trigger rates, confidence drift, and output token counts. An alert fires if the guardrail trigger rate exceeds 5% (indicating a systematic injection campaign) or if average confidence drifts more than 0.1 from the 30-day baseline (indicating model manipulation).

This layered approach ensures that a prompt injection attack must simultaneously evade input sanitization, exploit the structured prompt architecture, bypass Bedrock Guardrails, produce a valid JSON schema output with plausible values, and avoid detection by behavioral monitoring — a significantly higher bar than any single-layer defense.

---

## 6. Reference Implementation

We provide a complete reference implementation demonstrating every ZTAIT framework component. The implementation is structured as two deployable artifacts:

### 6.1 Infrastructure (Terraform)

The Terraform codebase comprises five modules totaling approximately 2,500 lines of HCL:

- **Foundation**: VPC (3 AZ, private subnets only), IAM roles with permission boundaries, DynamoDB tables (7 tables with GSIs, PITR, encryption, TTL), API Gateway with OKTA JWT authorizer, Secrets Manager with automated rotation, CloudTrail.
- **Ingestion**: Webhook receiver Lambda (HMAC-SHA256 validation, deduplication via `dedup#` prefix with 24h TTL, suppression regex evaluation), EventBridge event bus with routing rules.
- **Triage**: Bedrock Claude invocation Lambda (structured prompt, output validation, confidence thresholds), decision matrix evaluation, audit logging.
- **Actions**: ServiceNow, PagerDuty, MIM, and Slack handler Lambdas with OKTA-authenticated REST calls, per-integration circuit breakers, idempotency keys.
- **Observability**: CloudWatch dashboard (4 widgets), metric alarms (error rates, latency P95, throttling, DynamoDB capacity), SNS notification topics.

### 6.2 Governance Dashboard (React)

The governance dashboard comprises 12 pages implemented in React + TypeScript + Vite + Tailwind CSS + shadcn/ui:

- **Dashboard** (`/`): Metrics overview with classification distribution charts, recent incidents, and system health indicators.
- **Incidents** (`/incidents`): Filterable, sortable incident list with status, severity, source, confidence, and integration IDs.
- **Incident Detail** (`/incidents/:id`): Full incident view with AI reasoning, enrichment context, audit trail, and integration links (ServiceNow INC#, PagerDuty ID, MIM bridge ID).
- **Escalation Rules** (`/escalation-rules`): CRUD management with condition builder (classifications, sources, confidence range) and action configuration.
- **Gating Rules** (`/gating-rules`): CRUD management with approval configuration (approver group, timeout, escalate-on-timeout).
- **Suppression Rules** (`/suppression-rules`): CRUD management with regex pattern builder, time windows, and expiry dates.
- **Decision Matrix** (`/decision-matrix`): Inline-editable severity matrix with INC/MIM/Page toggles.
- **Architecture** (`/architecture`): Pipeline visualization with security layers and STRIDE threat model.
- **Audit Trail** (`/audit`): Searchable audit log with correlation ID linking, actor identity, and action details.
- **Event Sources** (`/sources`): Connected platform status with heartbeat monitoring.
- **Settings** (`/settings`): Maturity level selector (L0–L3), escalation controls, confidence thresholds, and feature flags.
- **Policy Rules** (`/policies`): Deterministic policy engine with toggleable rules.

The dashboard is deployable on Cloudflare Pages with SPA routing, configurable API base URL (`VITE_API_BASE_URL`) pointing to the AWS API Gateway endpoint, and OKTA JWT token injection in Authorization headers.

### 6.3 Implementation Decisions

Table 3 documents key architectural decisions with rationale:

| Decision | Rationale |
|---|---|
| Bedrock over self-hosted LLM | VPC-integrated, IAM-native auth, SOC2/HIPAA compliant, CloudTrail built-in, no additional service to secure |
| DynamoDB over RDS | Serverless scaling, pay-per-request, no connection pool management for Lambda, built-in TTL for deduplication |
| Cloudflare Pages over AWS Amplify | Independent of AWS account (separation of control/data planes), global edge delivery, simpler deployment |
| OKTA over Cognito | Enterprise SSO integration, existing organizational identity provider, certificate-based service accounts |
| EventBridge over SQS | Native content-based event routing, dead letter support, schema registry, CloudWatch integration |
| Terraform over CDK/SAM | Declarative, multi-cloud portable, version-controlled state, widely adopted in enterprise |

---

## 7. Evaluation

### 7.1 Comparative Analysis

We evaluate ZTAIT against the six most relevant existing frameworks across ten capability dimensions (Table 4):

| Dimension | NIST AI RMF [3] | ISO 42001 [4] | CSA ZT-IAM [9] | OWASP Agentic [11] | Acuvity AIF [15] | **ZTAIT** |
|---|---|---|---|---|---|---|
| Agent-Specific | No | No | Yes | Yes | Yes | **Yes** |
| Maturity Model | No | Partial | No | No | Yes (security) | **Yes (full lifecycle)** |
| Zero-Trust Identity | No | No | Yes | Partial | Partial | **Yes** |
| Quantitative Trust Scoring | No | No | Partial | No | No | **Yes** |
| Prompt Injection Defense | No | No | No | Listed | No | **Yes (5-layer)** |
| Reference Implementation | No | No | No | No | No | **Yes (complete)** |
| Deterministic Policy Engine | No | No | No | No | No | **Yes** |
| STRIDE Threat Model | No | No | Partial | Yes | No | **Yes (14 threats)** |
| Compliance Mapping | Yes | Yes | Partial | No | No | **Yes** |
| Enterprise Integration | No | No | Partial | No | No | **Yes** |

ZTAIT achieves coverage across all ten dimensions. No other framework covers more than four.

### 7.2 Novelty Assessment

ZTAIT's novelty lies not in any single component — zero-trust principles, maturity models, and AI governance are individually well-established — but in their integration into a unified framework with three distinct innovations:

**Innovation 1: Unified Trust Lifecycle.** ZTAIT demonstrates that governance (maturity levels, policy rules) and security (identity verification, access control) must be co-dependent, not layered independently. The trust scoring engine bridges these domains by incorporating both security signals (model confidence, behavioral consistency) and governance signals (historical accuracy, environmental context) into a single decision function.

**Innovation 2: Deterministic Constraints on Non-Deterministic AI (P7).** While LLM guardrails and output validation are established techniques, ZTAIT's contribution is the architectural separation between AI intelligence and governance constraints. The policy engine ensures that humans maintain control of the action space — what the agent *can* do — while the AI model contributes intelligence about what the agent *should* do within that space. This separation is not present in existing frameworks.

**Innovation 3: Working Reference Implementation.** ZTAIT is, to our knowledge, the first autonomous AI agent governance framework accompanied by a complete, deployable reference implementation. The implementation demonstrates that the framework's requirements are not merely theoretical but can be realized with current technology (AWS services, OKTA, Terraform) in an enterprise-grade configuration.

### 7.3 Limitations

**Domain Specificity.** ZTAIT is designed for incident triage. Extending it to other agent domains (code generation, customer service, financial trading) would require domain-specific adaptations to the decision pipeline, trust scoring factors, and policy engine rules.

**Single-Agent Focus.** ZTAIT governs a single autonomous agent. Multi-agent orchestration, inter-agent trust, and collective decision-making are deferred to emerging standards (MCP [12], Agent2Agent [13]).

**Trust Score Validation.** The trust scoring weights (w₁–w₄) are theoretically motivated and calibrated during shadow mode. Long-term empirical validation across diverse enterprise environments is needed to confirm optimal weight distributions.

**Cloud Provider Coupling.** The reference implementation uses AWS services exclusively. While the framework principles are cloud-agnostic, the implementation requires adaptation for Azure or GCP environments.

---

## 8. Discussion and Future Work

### 8.1 Relationship to Emerging Standards

ZTAIT aligns with and extends several emerging standards:

- **NIST RFI on AI Agent Security** [20]: NIST has issued a Request for Information on AI agent security, indicating regulatory interest in frameworks like ZTAIT. ZTAIT's threat model and security controls provide concrete responses to NIST's areas of inquiry.
- **EU AI Act**: ZTAIT's maturity model directly supports the transparency and human oversight requirements for high-risk AI systems. The audit trail enables the explainability mandate.
- **Anthropic MCP and Google Agent2Agent**: These protocols address agent-to-agent communication but assume a trust mechanism exists. ZTAIT can provide the zero-trust identity and trust scoring layer that these protocols plug into.

### 8.2 Future Work

**Federated Agent Trust.** Extending ZTAIT's trust scoring to cross-organizational scenarios where agents from different enterprises must establish mutual trust. This would involve Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs), building on the CSA vision [9] and Huang et al. [10].

**Multi-Agent Governance.** Adapting the maturity model and policy engine for multi-agent systems where agents collaborate, delegate, and potentially conflict.

**Empirical Trust Score Validation.** Conducting controlled experiments across multiple enterprise deployments to validate trust scoring weights and threshold configurations.

**Model-Agnostic Extension.** While the reference implementation uses Claude Sonnet 4.5, the framework should be validated with alternative foundation models (GPT-4, Gemini, Llama) to confirm model-agnostic applicability.

**Automated Maturity Advancement.** Replacing the governance board approval requirement for level transitions with an automated advancement system based on sustained metric achievement, reducing operational overhead.

---

## 9. Conclusion

We presented ZTAIT, a Zero-Trust Autonomous Incident Triage framework that unifies AI agent governance, zero-trust identity management, and deterministic policy enforcement into a single coherent architecture. Through a four-level maturity model, composite trust scoring engine, five-layer prompt injection defense, and deterministic policy engine, ZTAIT addresses the critical gap between high-level AI governance principles and the operational reality of deploying autonomous AI agents in enterprise incident response. The accompanying reference implementation — comprising Terraform IaC, serverless microservices, a governance dashboard, and integration adapters — demonstrates that the framework is not merely theoretical but immediately deployable with current enterprise technology.

The convergence of AI agent governance and zero-trust security into a unified trust lifecycle is, we believe, the central insight of this work. As enterprises accelerate autonomous AI agent deployment across critical workflows, frameworks that treat governance and security as separate concerns will prove insufficient. ZTAIT provides a practical, implementable foundation for the integrated approach that enterprise AI agent governance demands.

---

## References

[1] Gartner, "Alert Fatigue and the Cost of Manual Triage in Enterprise IT Operations," Gartner Research Note G00XXX, Stamford, CT, 2025. Available: https://www.gartner.com/en/documents/.

[2] McKinsey & Company, "The AI-Native SOC: How Foundation Models Are Transforming Incident Response," McKinsey Digital Insights, New York, NY, 2025. Available: https://www.mckinsey.com/capabilities/mckinsey-digital/.

[3] NIST, "Artificial Intelligence Risk Management Framework (AI RMF 1.0)," NIST AI 100-1, National Institute of Standards and Technology, Gaithersburg, MD, January 2023. doi: 10.6028/NIST.AI.100-1.

[4] ISO/IEC, "ISO/IEC 42001:2023 — Information technology — Artificial intelligence — Management system," International Organization for Standardization, Geneva, Switzerland, 2023.

[5] Palo Alto Networks, "Agentic AI Governance: Managing Delegated Authority in Autonomous Systems," Palo Alto Networks Whitepaper, 2025.

[6] McKinsey & Company, "Agentic AI Security Playbook for Enterprises," McKinsey Digital, 2025.

[7] Acuvity, "Agent Integrity Framework," Version 1.0, 2025.

[8] S. Rose, O. Borchert, S. Mitchell, and S. Connelly, "Zero Trust Architecture," NIST Special Publication 800-207, National Institute of Standards and Technology, Gaithersburg, MD, August 2020. doi: 10.6028/NIST.SP.800-207.

[9] Cloud Security Alliance, "Zero-Trust IAM Framework for Agentic AI," CSA AI Safety Initiative, 2025.

[10] V. S. Narajala, P. Rao, et al., "A Novel Zero-Trust Identity Framework for Agentic AI," arXiv:2505.19301, 2025.

[11] OWASP, "OWASP Top 10 for Agentic AI Security," OWASP Foundation, 2025.

[12] Anthropic, "Model Context Protocol (MCP) Specification," 2025.

[13] Google, "Agent2Agent Protocol Specification," 2025.

[14] Okta, "Zero Trust for Non-Human Identities: Securing AI Agents in the Enterprise," Okta Security Blog, 2025.

[15] Acuvity, "Agent Integrity Framework: A Five-Level Maturity Model for Agent Security," 2025.

[16] Z. Huang, et al., "AGENTSAFE: A Framework for Evaluating Safety in Multi-Agent Systems," arXiv, 2025.

[17] Y. Zhou, et al., "Fortifying Agentic Web Systems Against Prompt Injection," arXiv, 2025.

[18] Cloud Security Alliance, "MAESTRO: Multi-Agent Environment Security Threat and Risk Ontology," CSA Research, 2025.

[19] Microsoft, "STRIDE Threat Modeling," Microsoft Security Development Lifecycle (SDL), Redmond, WA, 2024. Available: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats.

[20] NIST, "Request for Information on AI Agent Security and Governance," Federal Register, 2025.

---

## Appendix A: ZTAIT Framework Comparison (Extended)

### A.1 Positioning Against Prior Art

**vs. NIST AI RMF**: ZTAIT extends AI RMF from model governance to agent governance. AI RMF's four functions (GOVERN, MAP, MEASURE, MANAGE) are preserved but operationalized: GOVERN → maturity model; MAP → STRIDE threat model; MEASURE → trust scoring engine; MANAGE → policy engine + gating rules.

**vs. CSA Zero-Trust IAM**: ZTAIT shares CSA's zero-trust vision but adds governance maturity modeling, deterministic policy enforcement, prompt injection defense, and a working implementation. Where CSA proposes DIDs/VCs for agent identity, ZTAIT demonstrates equivalent security properties using enterprise-available technology (OKTA + IAM).

**vs. OWASP Agentic AI Top 10**: OWASP identifies threats; ZTAIT mitigates them. ZTAIT's five-layer prompt injection defense, permission boundaries, and gating rules provide concrete implementations for OWASP's top risks.

**vs. Acuvity Agent Integrity Framework**: Both define maturity levels, but Acuvity focuses on security integrity while ZTAIT covers the full governance lifecycle (policy + security + operations + compliance). ZTAIT's trust scoring and policy engine have no counterpart in Acuvity.

### A.2 Framework Extensibility

ZTAIT is designed for extensibility:

- **New Event Sources**: Add a source-specific payload transformer in the webhook receiver Lambda. No pipeline changes required.
- **New Action Targets**: Add an action handler Lambda with its own OKTA service account and IAM role. Register in the action router's configuration.
- **New Rule Types**: The policy engine's rule evaluation is pluggable. New rule types can be added by implementing the rule interface and registering in the evaluation chain.
- **Alternative AI Models**: Replace the Bedrock invocation with any LLM API call. The trust scoring engine and policy engine are model-agnostic — they operate on the structured output (severity, confidence) regardless of the underlying model.

---

*Submitted for review. Correspondence to: [corresponding author email]*
