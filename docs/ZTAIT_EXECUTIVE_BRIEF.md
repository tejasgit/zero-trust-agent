# ZTAIT: Zero-Trust Autonomous Incident Triage

## Executive Brief

**Version:** 1.0 | **Date:** February 18, 2026 | **Classification:** Internal — Executive Audience

---

## The Problem

Enterprise IT operations face a compounding crisis:

- **Alert volume is unsustainable.** Industry surveys report that large enterprises generate tens of thousands of monitoring alerts daily across dozens of platforms. Level-1 engineers spend a majority of their time filtering noise rather than resolving incidents.
- **Response times cost revenue.** Industry data indicates that Mean Time to Detect (MTTD) for critical incidents typically remains measured in hours. Every minute of delay on a P1 production outage directly impacts revenue, SLA compliance, and customer trust.
- **Talent is scarce and expensive.** Experienced incident responders are in short supply. High turnover from alert fatigue compounds the problem. Off-hours coverage is particularly vulnerable to misclassification.

AI-powered autonomous triage agents can classify alerts, escalate incidents, and declare Major Incidents in seconds rather than hours. But deploying an AI agent with write access to production systems introduces risks that no existing governance framework adequately addresses.

---

## What ZTAIT Is

ZTAIT (Zero-Trust Autonomous Incident Triage) is a governance and security framework for deploying autonomous AI agents in enterprise incident response. It answers the question: **How do we let AI act fast while ensuring it acts right?**

ZTAIT unifies three disciplines that are typically addressed in isolation:

| Discipline | What It Covers | Why It Alone Is Insufficient |
|---|---|---|
| **AI Governance** | Maturity models, oversight, compliance | Tells you *what* to govern, not *how* to enforce it technically |
| **Zero-Trust Security** | Identity, access control, verification | Ensures the agent *can* act, but not that it *should* act |
| **Incident Management** | ITIL processes, escalation, MIM | Defines the workflow but has no AI-specific controls |

ZTAIT integrates all three into a unified trust lifecycle: the AI agent earns autonomy progressively, every action is verified against quantitative trust metrics, and deterministic policy rules constrain what the AI can do regardless of what it recommends.

---

## How It Works — Four Key Mechanisms

### 1. Progressive Autonomy (Maturity Model)

The AI agent does not go from zero to full autonomy overnight. ZTAIT defines four levels with measurable advancement criteria and automatic safety regression:

| Level | Agent Role | Human Role | Key Gate to Advance |
|---|---|---|---|
| **L0 — Shadow** | Observes and classifies silently | Makes all decisions | Agent accuracy ≥ 85% over 30+ days, ≥ 200 incidents |
| **L1 — Assisted** | Recommends actions | Reviews and approves every recommendation | Human override rate ≤ 15% over 30 days, no P1/P2 misclassification |
| **L2 — Supervised** | Acts autonomously on low-severity; human approves high-severity | Approves P1/P2 actions only | P3/P4 accuracy ≥ 90%, gating rules tested, min 60 days at L2 |
| **L3 — Autonomous** | Acts on all severity levels | Reviews after the fact, investigates anomalies | Ongoing: accuracy ≥ 95%, with automatic regression if it drops |

**Safety net:** If accuracy drops below 90% for 7 consecutive days, the system automatically steps back to a lower level. A security event (e.g., prompt injection detected) triggers an immediate reset to L0.

### 2. Trust Scoring

Every AI decision gets a quantitative trust score (0 to 1.0) computed from four factors:

| Factor | Weight | What It Measures |
|---|---|---|
| **Model Confidence** | 50% | How certain is the AI in its own classification? |
| **Historical Accuracy** | 25% | How accurate has the AI been for this type of event over the past 30 days? |
| **Behavioral Consistency** | 15% | Is this classification consistent with what the AI normally says about events from this source? |
| **Environmental Context** | 10% | Are we in a maintenance window, mass-failure event, or off-hours? |

The trust score determines what happens next:

| Trust Score | Action |
|---|---|
| 0.90+ | Execute automatically |
| 0.70 – 0.89 | Execute unless a gating rule requires approval |
| 0.50 – 0.69 | Force human review |
| Below 0.50 | Suppress and flag for investigation |

### 3. Deterministic Policy Engine

The AI recommends severity and actions. But a human-configurable policy engine makes the final call:

- **Decision Matrix** — Maps severity levels to required actions (e.g., P1 always creates an incident + pages on-call + declares MIM). The AI cannot act outside this matrix.
- **Gating Rules** — Intercept high-impact actions and require human approval when confidence is low (e.g., MIM declarations below 0.85 confidence must be approved).
- **Suppression Rules** — Filter known noise before the AI even sees it, reducing cost and false positives.
- **Escalation Rules** — Route incidents to the right teams and integrations based on source, severity, and confidence.

**Key principle:** The AI provides intelligence. The policy engine provides governance. They are architecturally separated so that policy changes never require AI model changes.

### 4. Five-Layer Security Stack

ZTAIT assumes every input is potentially adversarial (zero trust). Five independent layers defend against prompt injection and other AI-specific attacks:

| Layer | Defense |
|---|---|
| 1. Input Sanitization | Strip injection patterns before they reach the AI |
| 2. Structured Prompts | AI operates within rigid system instructions that cannot be overridden by input |
| 3. Bedrock Guardrails | AWS-native content filtering on AI inputs and outputs |
| 4. Output Validation | Schema enforcement — the AI can only return valid severity levels and confidence ranges |
| 5. Behavioral Monitoring | Detect anomalous classification patterns that suggest manipulation |

No single layer is trusted alone. Each threat has at least two independent mitigations.

---

## Business Value

| Outcome | Mechanism |
|---|---|
| **Faster incident response** | AI classifies and escalates in seconds rather than the minutes or hours typical of manual triage. MTTD and MTTR are expected to improve measurably at each maturity level, validated during L0 shadow mode. |
| **Reduced operational cost** | L1 engineers focus on resolution instead of noise filtering. Off-hours coverage improves without additional headcount. |
| **Lower risk than manual triage** | Trust scoring catches the cases where the AI is uncertain or behaving anomalously. Automatic regression prevents sustained errors. |
| **Audit and compliance readiness** | Every decision is logged with full reasoning, correlation ID, and actor identity. Maps directly to SOC 2, HIPAA, GDPR, SOX, and EU AI Act requirements. |
| **Controlled adoption** | The maturity model eliminates the "all or nothing" AI deployment risk. Each level can be validated independently before proceeding. |
| **Vendor and model flexibility** | The framework is model-agnostic. The reference implementation uses AWS Bedrock (Claude), but the architecture supports alternative providers. |

---

## What We Built (Reference Implementation)

ZTAIT is not just a whitepaper. It includes a fully deployable reference implementation:

| Component | Technology | Purpose |
|---|---|---|
| **Infrastructure** | Terraform (5 modules) | VPC, IAM, DynamoDB, Lambda, API Gateway, EventBridge, CloudWatch — deployed with a single `terraform apply` |
| **AI Engine** | AWS Bedrock (Claude Sonnet 4.5) | Alert classification with structured output, 5-layer prompt injection defense |
| **Governance Dashboard** | React + TypeScript (Cloudflare Pages) | 12-page management console for rules, incidents, audit trail, decision matrix, maturity settings |
| **Integrations** | REST + OKTA OAuth 2.0 | ServiceNow, PagerDuty, Slack, MIM — each with its own service identity and scoped credentials |
| **Security** | IAM Permission Boundaries, HMAC-SHA256, OKTA JWT | Zero-trust enforcement at every boundary |

**Target deployment timeline:** Approximately 6 weeks from kickoff to L0 (Shadow Mode) with real production alerts, depending on organizational readiness and integration complexity.

---

## Competitive Landscape

We evaluated five existing frameworks against ZTAIT across ten dimensions:

| Capability | NIST AI RMF | ISO 42001 | CSA ZT-IAM | OWASP Agentic | Acuvity AIF | ZTAIT |
|---|---|---|---|---|---|---|
| Agent-Specific Controls | | | Yes | Yes | Yes | **Yes** |
| Governance Maturity Model | | Partial | | | Security only | **Comprehensive** |
| Zero-Trust Identity | | | Yes | Partial | Partial | **Yes** |
| Quantitative Trust Scoring | | | Partial | | | **Yes** |
| Prompt Injection Defense | | | | Listed | | **5-Layer** |
| Reference Implementation | | | | | | **Complete** |
| Deterministic Policy Engine | | | | | | **Yes** |
| STRIDE Threat Model (14 threats) | | | Partial | Yes | | **Yes** |
| Compliance Mapping | Yes | Yes | Partial | | | **Yes** |
| Enterprise Integrations | | | Partial | | | **SNOW/PD/Slack/MIM** |

To our knowledge, no existing framework combines governance maturity modeling, zero-trust agent identity, quantitative trust scoring, and a working reference implementation in a single specification.

---

## Compliance Alignment

ZTAIT's controls map to major regulatory and industry frameworks:

| Regulation / Standard | ZTAIT Coverage |
|---|---|
| **NIST AI RMF** | Maturity model maps to GOVERN/MAP/MEASURE/MANAGE functions |
| **NIST SP 800-207 (Zero Trust)** | Agent identity, least privilege, continuous verification, micro-segmentation |
| **ISO 42001** | AI management system structure, risk assessment, documentation |
| **SOC 2** | Immutable audit trail, access controls, change management, monitoring |
| **HIPAA** | Encryption at rest/in transit, access control, audit retention, BAA coverage |
| **GDPR** | Regional data residency, PII redaction via Bedrock Guardrails, data minimization |
| **SOX** | Separation of duties, immutable audit trail, change management via Terraform |
| **EU AI Act** | Transparency (maturity model), explainability (audit trail), human oversight (L0-L2) |

---

## Risk Considerations

| Risk | Mitigation |
|---|---|
| AI misclassifies a critical incident | Trust scoring catches low-confidence decisions; gating rules require human approval for high-impact actions; automatic regression on accuracy degradation |
| Prompt injection via alert payloads | Five independent defense layers; no single bypass defeats all five |
| Credential compromise | 15-minute JWT TTL, 90-day automated rotation, per-integration scoped secrets, IAM permission boundaries cap maximum access |
| Over-reliance on AI | Maturity model enforces progressive trust; L0-L2 maintain human oversight; regression policy prevents sustained autonomy during accuracy drops |
| Vendor lock-in | Framework is model-agnostic; reference implementation is infrastructure-as-code; dashboard deploys independently of cloud provider |

---

## Recommended Next Steps

| Step | Timeline | Owner |
|---|---|---|
| 1. Executive alignment on ZTAIT adoption | Week 1 | CISO / VP Engineering |
| 2. Identify pilot scope (2-3 alert sources) | Week 1-2 | Platform Engineering |
| 3. Deploy Terraform foundation (VPC, IAM, DynamoDB) | Week 2-3 | Cloud Engineering |
| 4. Configure OKTA service accounts and integrations | Week 3-4 | Identity & Access |
| 5. Deploy AI engine in L0 Shadow Mode | Week 5-6 | AI/ML Engineering |
| 6. Monitor shadow metrics, calibrate trust scoring | Week 6-10 | Platform + AI/ML |
| 7. Governance board review for L1 advancement | Week 10+ | CISO + Engineering Leadership |

---

## Publication and Thought Leadership

ZTAIT is positioned for publication and industry adoption:

- **ArXiv preprint** (cs.CR / cs.AI) — Establishes priority and enables peer review
- **Industry whitepapers** — CSA, OWASP project submissions for practitioner adoption
- **Conference presentations** — RSA Conference, Black Hat, ACSAC for visibility
- **Open-source release** — Apache 2.0 licensed reference implementation for community adoption

---

## Key Takeaway

The question is no longer *whether* to deploy AI agents in incident response — it is *how* to deploy them safely. ZTAIT provides the governance framework, security architecture, and working implementation to answer that question with confidence.

**AI provides intelligence. Policy provides governance. Trust is earned, not assumed.**

---

*For the full technical specification, see `docs/ZTAIT_FRAMEWORK.md` (1,000+ lines) and `docs/TECHNICAL_SPECIFICATION.md` (70+ pages).*

*For the academic paper draft, see `docs/ZTAIT_ARXIV_PAPER.md`.*
