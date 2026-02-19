# ZTAIT: A Zero-Trust Framework for Governing Autonomous AI Agents in Enterprise Incident Response

**ArXiv Submission Brief** | **Primary:** cs.CR | **Secondary:** cs.AI | **February 2026**

---

## Motivation

Autonomous AI agents are being deployed to classify, escalate, and orchestrate enterprise incident response at machine speed. These agents have write access to production systems — ServiceNow, PagerDuty, incident bridges — yet no existing governance framework addresses the unique intersection of AI trust, zero-trust security, and real-time autonomous action in critical infrastructure.

Current frameworks address pieces of the problem in isolation:

- **NIST AI RMF / ISO 42001** govern AI model lifecycle but provide no agent-level operational controls.
- **CSA Zero-Trust IAM for Agents / Huang et al. (arXiv:2505.19301)** address agent identity but lack governance maturity models and reference implementations.
- **OWASP Agentic AI Top 10 / Acuvity AIF** catalog security risks but do not provide integrated trust scoring or deterministic policy enforcement.

None unify governance, security, and operational controls into a single implementable specification.

---

## Contributions

ZTAIT (Zero-Trust Autonomous Incident Triage) makes four contributions:

**C1 — Governance Maturity Model.** A four-level progressive autonomy model (L0: Shadow, L1: Assisted, L2: Supervised, L3: Autonomous) with quantitative entry/exit criteria at each level and automatic regression on accuracy degradation or security events.

**C2 — Composite Trust Scoring Engine.** A formal trust score T(i) = w₁·C(i) + w₂·B(i,s) + w₃·H(s,c) + w₄·E(i) combining model confidence, behavioral consistency, historical accuracy, and environmental context. The score dynamically gates whether actions execute autonomously, require human approval, or are suppressed. Weights are calibrated during shadow mode via grid search against human operator decisions.

**C3 — Five-Layer Prompt Injection Defense.** A defense-in-depth stack (input sanitization, structured prompts, cloud-native guardrails, output schema validation, behavioral anomaly detection) designed for AI agents that process untrusted input from external monitoring systems.

**C4 — Deterministic Policy Engine.** Four rule types (escalation, gating, suppression, decision matrix) that architecturally separate AI intelligence from governance enforcement. The AI classifies; the policy engine constrains. Policy changes require no model changes.

---

## Gap Analysis

| Capability | NIST AI RMF | ISO 42001 | CSA ZT-IAM | OWASP Agentic | Acuvity AIF | **ZTAIT** |
|---|---|---|---|---|---|---|
| Agent-Specific Controls | — | — | Yes | Yes | Yes | **Yes** |
| Governance Maturity Model | — | Partial | — | — | Security only | **Comprehensive** |
| Zero-Trust Identity | — | — | Yes | Partial | Partial | **Yes** |
| Quantitative Trust Scoring | — | — | Partial | — | — | **Yes** |
| Prompt Injection Defense | — | — | — | Listed | — | **5-Layer** |
| Reference Implementation | — | — | — | — | — | **Complete** |
| Deterministic Policy Engine | — | — | — | — | — | **Yes** |
| STRIDE Threat Model | — | Partial | Partial | Yes | — | **14 Threats** |

To our knowledge, ZTAIT is among the first frameworks to integrate all eight capabilities in a single specification.

---

## Reference Implementation

The paper is accompanied by a complete, deployable reference implementation:

- **Infrastructure as Code:** Terraform modules (VPC, IAM, DynamoDB, Lambda, API Gateway, EventBridge, CloudWatch) for AWS deployment
- **AI Classification:** AWS Bedrock integration with structured output schema and five-layer defense stack
- **Governance Dashboard:** React/TypeScript application (12 pages) for rule management, incident review, audit trail, and maturity configuration
- **Integration Adapters:** ServiceNow, PagerDuty, Slack, and MIM with per-integration OKTA service identities
- **Security Controls:** IAM permission boundaries, HMAC-SHA256 webhook validation, OKTA JWT authorization, VPC-isolated compute

---

## Security Analysis

The paper applies STRIDE threat modeling to the full triage pipeline, identifying 14 threats (T1–T14) across spoofing, tampering, repudiation, information disclosure, denial of service, and elevation of privilege. Each threat has at least two independent mitigations at different architectural layers. Compliance mapping covers NIST AI RMF, NIST SP 800-207, ISO 42001, SOC 2, HIPAA, GDPR, and EU AI Act.

---

## Paper Details

- **Length:** ~8,000 words, 9 sections, 20 references
- **Structure:** Introduction, Related Work, Core Principles, Framework Architecture, Security Analysis, Reference Implementation, Comparative Evaluation, Discussion & Future Work, Conclusion
- **Related work surveyed:** NIST AI RMF, ISO 42001, NIST SP 800-207, CSA ZT-IAM, Huang et al. (arXiv:2505.19301), OWASP Agentic AI Top 10, Acuvity AIF, CSA MAESTRO, Palo Alto Networks EAAGF, McKinsey Agentic AI Security Playbook
- **ArXiv categories:** cs.CR (primary), cs.AI (secondary)
- **Full paper and reference implementation available upon request**
