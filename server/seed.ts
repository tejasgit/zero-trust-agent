import { db } from "./db";
import {
  incidents, auditLogs, policyRules, eventSources, systemSettings,
  escalationRules, gatingRules, suppressionRules, decisionMatrix,
} from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const [existingIncident] = await db.select().from(incidents).limit(1);
  const [existingEscRule] = await db.select().from(escalationRules).limit(1);

  if (existingIncident && existingEscRule) return;
  if (existingIncident) {
    await seedRuleTables();
    return;
  }

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  await db.insert(systemSettings).values({
    id: "system",
    maturityLevel: 3,
    autoEscalation: true,
    mimGating: true,
    confidenceThreshold: 0.85,
    deduplicationWindow: 300,
  }).onConflictDoNothing();

  const seedSources = await db.insert(eventSources).values([
    { name: "Salesforce", type: "webhook", status: "active", lastHeartbeat: hoursAgo(0.1), eventsProcessed: 12847 },
    { name: "SnapLogic", type: "webhook", status: "active", lastHeartbeat: hoursAgo(0.2), eventsProcessed: 8432 },
    { name: "AWS CloudWatch", type: "streaming", status: "active", lastHeartbeat: hoursAgo(0.05), eventsProcessed: 45621 },
    { name: "Adobe Experience Manager", type: "polling", status: "active", lastHeartbeat: hoursAgo(0.5), eventsProcessed: 3215 },
    { name: "Splunk", type: "webhook", status: "active", lastHeartbeat: hoursAgo(0.1), eventsProcessed: 28934 },
    { name: "New Relic", type: "streaming", status: "inactive", lastHeartbeat: hoursAgo(4), eventsProcessed: 15672 },
  ]).returning();

  const seedIncidents = await db.insert(incidents).values([
    {
      title: "Salesforce API Gateway 502 Errors Spike",
      description: "Salesforce integration gateway returning 502 errors at 15x normal rate. Customer-facing flows affected including order processing and account lookups. Multiple regions impacted.",
      source: "Salesforce",
      classification: "sev1",
      confidence: 0.96,
      status: "escalated",
      priority: "critical",
      assignmentGroup: "Platform Engineering",
      escalationAction: "pagerduty-escalate + mim-trigger",
      aiReasoning: "High error rate (502) across multiple regions affecting customer-facing operations. Pattern matches historical SEV1 incidents. Revenue-impacting with broad blast radius. Two independent signals confirmed: CloudWatch error rate alarm + Splunk error log correlation.",
      correlationId: "CID-2026-0217-001",
      snowId: "INC0042891",
      pdId: "PD-2026-8834",
      mimId: "MIM-2026-012",
      rawPayload: { error_code: 502, regions: ["us-east-1", "eu-west-1"], error_rate: "15x baseline", first_seen: "2026-02-17T08:23:00Z" },
      createdAt: hoursAgo(3),
    },
    {
      title: "SnapLogic Pipeline Memory Leak Detection",
      description: "Data integration pipeline 'CRM-Sync-Prod' showing gradual memory increase. Currently at 87% heap utilization with projected OOM in 4 hours.",
      source: "SnapLogic",
      classification: "high",
      confidence: 0.89,
      status: "triaging",
      priority: "high",
      assignmentGroup: "Integration Team",
      escalationAction: "servicenow-create",
      aiReasoning: "Memory utilization trending upward with consistent gradient. Historical pattern analysis shows similar behavior led to OOM crash twice in last 90 days. Proactive intervention recommended before threshold breach.",
      correlationId: "CID-2026-0217-002",
      snowId: "INC0042892",
      rawPayload: { pipeline: "CRM-Sync-Prod", heap_pct: 87, trend: "increasing", projected_oom: "4h" },
      createdAt: hoursAgo(2),
    },
    {
      title: "AWS Lambda Throttling in Payment Service",
      description: "Payment processing Lambda functions hitting concurrent execution limits. Approximately 12% of invocations throttled in last 30 minutes.",
      source: "AWS CloudWatch",
      classification: "high",
      confidence: 0.92,
      status: "open",
      priority: "high",
      assignmentGroup: "Cloud Infrastructure",
      escalationAction: "pagerduty-escalate",
      aiReasoning: "Lambda throttling at 12% indicates capacity concern for payment-critical path. Revenue impact likely if sustained. Correlation with increased order volume from marketing campaign launch at 14:00 UTC.",
      correlationId: "CID-2026-0217-003",
      pdId: "PD-2026-8835",
      rawPayload: { function: "payment-processor-prod", throttle_pct: 12, concurrent_executions: 1000, region: "us-east-1" },
      createdAt: hoursAgo(1.5),
    },
    {
      title: "AEM Publish Queue Backlog Growing",
      description: "Content publish queue for production site showing 450+ pending items. Normal baseline is under 20. Author environment unaffected.",
      source: "Adobe Experience Manager",
      classification: "medium",
      confidence: 0.78,
      status: "open",
      priority: "medium",
      assignmentGroup: "Content Platform",
      escalationAction: "servicenow-create",
      aiReasoning: "Publish queue backlog is significant but not yet impacting live site. Could indicate dispatcher or replication agent issue. Moderate confidence due to lack of error logs correlating with queue growth.",
      correlationId: "CID-2026-0217-004",
      snowId: "INC0042893",
      rawPayload: { queue_depth: 450, baseline: 20, environment: "publish-prod" },
      createdAt: hoursAgo(1),
    },
    {
      title: "Splunk Forwarder Heartbeat Loss - DC2",
      description: "Universal forwarder fleet in data center 2 showing 8 out of 45 forwarders with missed heartbeats in last 15 minutes.",
      source: "Splunk",
      classification: "medium",
      confidence: 0.82,
      status: "triaging",
      priority: "medium",
      assignmentGroup: "Observability Team",
      escalationAction: "servicenow-create",
      aiReasoning: "Partial forwarder loss (18%) in single data center. Not yet impacting log completeness significantly but indicates potential network or infrastructure issue in DC2. Similar pattern preceded DC2 network partition incident last quarter.",
      correlationId: "CID-2026-0217-005",
      snowId: "INC0042894",
      rawPayload: { dc: "DC2", missing_forwarders: 8, total_forwarders: 45, duration_min: 15 },
      createdAt: hoursAgo(0.5),
    },
    {
      title: "CloudWatch Billing Alarm - Development Account",
      description: "AWS billing alarm triggered for development account. Current month spend at $2,400 against $2,000 budget threshold.",
      source: "AWS CloudWatch",
      classification: "low",
      confidence: 0.95,
      status: "resolved",
      priority: "low",
      assignmentGroup: "FinOps",
      escalationAction: "servicenow-create",
      aiReasoning: "Billing threshold exceeded in non-production account. High confidence classification as low priority. No operational impact. Likely caused by left-running resources from load testing.",
      correlationId: "CID-2026-0217-006",
      snowId: "INC0042895",
      rawPayload: { account: "dev-123456", spend: 2400, budget: 2000, currency: "USD" },
      createdAt: hoursAgo(5),
    },
    {
      title: "New Relic Synthetic Monitor Timeout - Status Page",
      description: "External synthetic monitor for public status page timing out intermittently. 3 of 12 checks failed in last hour.",
      source: "New Relic",
      classification: "noise",
      confidence: 0.88,
      status: "suppressed",
      priority: "low",
      escalationAction: "suppress",
      aiReasoning: "Intermittent synthetic failures (25%) likely transient network issue or monitor location-specific. Status page backend is healthy per internal checks. Previous occurrences auto-resolved. Suppressing per noise policy.",
      correlationId: "CID-2026-0217-007",
      rawPayload: { monitor: "status-page-check", failures: 3, total: 12, locations: ["us-west", "eu-central"] },
      createdAt: hoursAgo(4),
    },
    {
      title: "Salesforce Bulk API Rate Limit Approaching",
      description: "Bulk API usage at 82% of daily allocation. Data sync jobs consuming more API calls than projected.",
      source: "Salesforce",
      classification: "low",
      confidence: 0.91,
      status: "human-review",
      priority: "medium",
      assignmentGroup: "Salesforce Admin",
      escalationAction: "human-review",
      aiReasoning: "API rate approaching limit but not yet impacted. Classification as low severity but routing to human review because action requires business decision on which sync jobs to deprioritize. AI cannot make business priority calls.",
      correlationId: "CID-2026-0217-008",
      rawPayload: { api_usage_pct: 82, daily_limit: 100000, current_calls: 82000 },
      createdAt: hoursAgo(2.5),
    },
  ]).returning();

  for (const inc of seedIncidents) {
    await db.insert(auditLogs).values({
      incidentId: inc.id,
      action: "create",
      actor: "triage-agent",
      detail: `Incident ingested from ${inc.source}: ${inc.title}`,
      correlationId: inc.correlationId,
    });
    await db.insert(auditLogs).values({
      incidentId: inc.id,
      action: "classify",
      actor: "bedrock-agent",
      detail: `AI classified as ${inc.classification} with ${Math.round(inc.confidence * 100)}% confidence`,
      correlationId: inc.correlationId,
    });
    if (inc.escalationAction && inc.escalationAction !== "suppress") {
      await db.insert(auditLogs).values({
        incidentId: inc.id,
        action: inc.escalationAction.includes("mim") ? "mim-trigger" : "escalate",
        actor: "policy-engine",
        detail: `Escalation action: ${inc.escalationAction}`,
        correlationId: inc.correlationId,
      });
    }
  }

  await db.insert(policyRules).values([
    {
      name: "High Confidence Auto-Escalate",
      description: "Automatically escalate incidents when AI confidence exceeds threshold and classification is high or sev1",
      condition: "confidence >= threshold AND classification IN (high, sev1)",
      action: "pagerduty-escalate",
      threshold: 0.85,
      enabled: true,
      category: "escalation",
    },
    {
      name: "Production-Only MIM Gating",
      description: "Only trigger MIM process for production environment incidents with two-signal confirmation",
      condition: "environment = production AND signals >= 2",
      action: "mim-trigger",
      threshold: 0.90,
      enabled: true,
      category: "gating",
    },
    {
      name: "Noise Suppression Window",
      description: "Suppress duplicate alerts within deduplication window based on incident signature hash",
      condition: "signature_match = true AND within_window = true",
      action: "suppress",
      threshold: null,
      enabled: true,
      category: "suppression",
    },
    {
      name: "Low Confidence Human Review",
      description: "Route to human review when AI confidence is below threshold",
      condition: "confidence < threshold",
      action: "human-review",
      threshold: 0.70,
      enabled: true,
      category: "validation",
    },
    {
      name: "Two-Signal MIM Confirmation",
      description: "Require corroborating signal from second monitoring source before MIM activation",
      condition: "classification = sev1 AND correlated_sources >= 2",
      action: "mim-confirm",
      threshold: 0.90,
      enabled: true,
      category: "gating",
    },
    {
      name: "Rate Limit Circuit Breaker",
      description: "Pause auto-escalation if more than 5 escalations occur within 10 minutes",
      condition: "escalation_count > 5 AND window = 10m",
      action: "pause-escalation",
      threshold: null,
      enabled: true,
      category: "validation",
    },
    {
      name: "Fail-Closed Identity Check",
      description: "Block all automated actions if Okta token validation fails",
      condition: "token_valid = false OR token_expired = true",
      action: "block-all",
      threshold: null,
      enabled: true,
      category: "validation",
    },
  ]);

  await seedRuleTables();

  console.log("Database seeded successfully");
}

async function seedRuleTables() {
  await db.insert(escalationRules).values([
    {
      name: "SEV1 Auto-Page + MIM",
      description: "When AI classifies as SEV1 with high confidence, immediately page on-call and trigger Major Incident Management",
      priority: 10,
      enabled: true,
      conditionClassification: "sev1",
      conditionMinConfidence: 0.90,
      conditionPriority: "critical",
      actionType: "pagerduty-escalate",
      actionTarget: "sre-oncall",
      actionConfig: { urgency: "high", escalation_policy: "sev1-default", trigger_mim: true },
    },
    {
      name: "High Severity ServiceNow INC",
      description: "Create ServiceNow incident for all high-severity classifications with assignment to appropriate team",
      priority: 20,
      enabled: true,
      conditionClassification: "high",
      conditionMinConfidence: 0.80,
      conditionPriority: "high",
      actionType: "servicenow-create",
      actionTarget: "platform-engineering",
      actionConfig: { impact: "2", urgency: "2", category: "Infrastructure" },
    },
    {
      name: "Medium Priority Slack Alert",
      description: "Send Slack notification to incident channel for medium-priority incidents requiring awareness",
      priority: 30,
      enabled: true,
      conditionClassification: "medium",
      conditionMinConfidence: 0.70,
      conditionPriority: "medium",
      actionType: "slack-notify",
      actionTarget: "#incident-triage",
      actionConfig: { mention_group: "@infra-leads", thread: true },
    },
    {
      name: "Low Confidence Human Review",
      description: "Route incidents with low AI confidence to human review queue for manual triage",
      priority: 50,
      enabled: true,
      conditionMaxConfidence: 0.70,
      actionType: "human-review",
      actionTarget: "triage-queue",
      actionConfig: { sla_minutes: 30, notify_channel: "#triage-review" },
    },
    {
      name: "Multi-Region Blast Radius Escalation",
      description: "Escalate when source indicates multi-region impact regardless of initial classification",
      priority: 15,
      enabled: true,
      conditionSource: "AWS CloudWatch",
      conditionClassification: "high",
      conditionMinConfidence: 0.85,
      actionType: "pagerduty-escalate",
      actionTarget: "cloud-infra-oncall",
      actionConfig: { urgency: "high", include_runbook: true },
    },
  ]);

  await db.insert(gatingRules).values([
    {
      name: "MIM Activation Gate",
      description: "Require minimum 92% confidence and human approval before triggering Major Incident Management process",
      enabled: true,
      actionType: "mim-trigger",
      minConfidence: 0.92,
      requireHumanApproval: true,
      approvalTimeout: 600,
      fallbackAction: "queue",
    },
    {
      name: "PagerDuty Page Gate",
      description: "Allow auto-paging at 88% confidence without human approval for faster response times",
      enabled: true,
      actionType: "pagerduty-escalate",
      minConfidence: 0.88,
      requireHumanApproval: false,
      approvalTimeout: 300,
      fallbackAction: "slack-notify",
    },
    {
      name: "ServiceNow INC Gate",
      description: "Auto-create ServiceNow incidents at 75% confidence. Low-risk action, no approval needed",
      enabled: true,
      actionType: "servicenow-create",
      minConfidence: 0.75,
      requireHumanApproval: false,
      approvalTimeout: 900,
      fallbackAction: "queue",
    },
    {
      name: "Slack Notification Gate",
      description: "Allow Slack notifications at 60% confidence. Informational only, minimal blast radius",
      enabled: true,
      actionType: "slack-notify",
      minConfidence: 0.60,
      requireHumanApproval: false,
      approvalTimeout: 0,
      fallbackAction: "log",
    },
    {
      name: "Auto-Suppress Gate",
      description: "Require 95% confidence to auto-suppress. High bar prevents suppressing real incidents",
      enabled: true,
      actionType: "suppress",
      minConfidence: 0.95,
      requireHumanApproval: false,
      approvalTimeout: 0,
      fallbackAction: "human-review",
    },
  ]);

  await db.insert(suppressionRules).values([
    {
      name: "New Relic Synthetic Flaps",
      description: "Suppress transient synthetic monitor failures that auto-resolve within 10 minutes",
      enabled: true,
      sourcePattern: "New Relic",
      titlePattern: "Synthetic Monitor.*Timeout",
      suppressedCount: 47,
    },
    {
      name: "Dev Account Billing Alerts",
      description: "Suppress billing alerts from development and sandbox AWS accounts",
      enabled: true,
      sourcePattern: "AWS CloudWatch",
      titlePattern: "Billing Alarm.*Development",
      classificationPattern: "low|noise",
      suppressedCount: 12,
    },
    {
      name: "Maintenance Window - Weekend Deploys",
      description: "Suppress expected alerts during scheduled weekend deployment windows",
      enabled: false,
      titlePattern: "Deploy|Deployment|Rolling Update",
      timeWindowStart: "02:00",
      timeWindowEnd: "06:00",
      suppressedCount: 83,
    },
    {
      name: "Known Flaky Health Checks",
      description: "Suppress health check failures for services with known intermittent connectivity issues",
      enabled: true,
      sourcePattern: "Splunk|New Relic",
      titlePattern: "Health Check.*Failed|Heartbeat.*Loss",
      suppressedCount: 156,
    },
  ]);

  await db.insert(decisionMatrix).values([
    {
      severity: "SEV1",
      description: "Critical business impact - Complete service outage, data loss risk, or security breach affecting production",
      createIncident: true,
      triggerMim: true,
      pageOncall: true,
      nrSignal: "NRQL: error_rate > 50% OR availability < 95%",
      exampleSources: "CloudWatch, PagerDuty, Salesforce (production)",
      criteria: "Multi-region impact, revenue-affecting, customer-facing degradation >50%, security incident",
      sortOrder: 1,
    },
    {
      severity: "SEV2",
      description: "Major impact - Significant degradation to critical business function, single region outage",
      createIncident: true,
      triggerMim: false,
      pageOncall: true,
      nrSignal: "NRQL: error_rate > 20% OR p99_latency > 5s",
      exampleSources: "CloudWatch, SnapLogic, Splunk",
      criteria: "Single region impact, partial service degradation, non-customer-facing critical path affected",
      sortOrder: 2,
    },
    {
      severity: "SEV3",
      description: "Moderate impact - Non-critical service degradation, workaround available, limited user impact",
      createIncident: true,
      triggerMim: false,
      pageOncall: false,
      nrSignal: "NRQL: error_rate > 5% OR queue_depth > 10x baseline",
      exampleSources: "AEM, Splunk, SnapLogic",
      criteria: "Non-critical path affected, workaround exists, limited blast radius, no revenue impact",
      sortOrder: 3,
    },
    {
      severity: "SEV4",
      description: "Low impact - Minor issue, cosmetic defect, or performance degradation within acceptable bounds",
      createIncident: true,
      triggerMim: false,
      pageOncall: false,
      nrSignal: "NRQL: error_rate > 1% OR cpu_usage > 80%",
      exampleSources: "CloudWatch, New Relic",
      criteria: "Non-production impact, minor degradation, informational alert, capacity planning",
      sortOrder: 4,
    },
    {
      severity: "Noise",
      description: "No action required - Transient alert, known false positive, or duplicate of existing incident",
      createIncident: false,
      triggerMim: false,
      pageOncall: false,
      nrSignal: "N/A - Suppressed at ingestion",
      exampleSources: "Any source with flapping pattern",
      criteria: "Transient failure, auto-resolved, duplicate signature, maintenance window, known flaky check",
      sortOrder: 5,
    },
  ]);

  console.log("Rule tables seeded successfully");
}
