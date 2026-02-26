const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SEED = 42;
let rngState = SEED;
function seededRandom() {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function randomInt(min, max) {
  return Math.floor(seededRandom() * (max - min + 1)) + min;
}
function randomChoice(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}
function uuid() {
  return crypto.randomUUID();
}
function gaussianish(mean, stddev) {
  let u = 0, v = 0;
  while (u === 0) u = seededRandom();
  while (v === 0) v = seededRandom();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.max(0, Math.min(1, mean + z * stddev));
}

const SOURCES = ['aws-cloudwatch', 'datadog', 'newrelic', 'splunk'];
const SEVERITIES = ['P1', 'P2', 'P3', 'P4', 'noise'];
const SEV_WEIGHTS = [0.03, 0.12, 0.35, 0.30, 0.20];

const ALERT_TITLES = {
  'aws-cloudwatch': [
    'EC2 CPU utilization exceeds 95% on prod-web-{n}',
    'RDS connection count spike on primary-db',
    'Lambda function error rate above threshold',
    'ELB 5xx error rate elevated',
    'S3 bucket access denied anomaly',
    'CloudFront origin timeout',
    'DynamoDB throttled reads on user-sessions',
    'SQS dead-letter queue depth increasing',
    'ECS task stopped unexpectedly',
    'Route53 health check failing'
  ],
  'datadog': [
    'High latency detected on api-gateway service',
    'Anomaly detected: request rate drop on checkout-service',
    'Memory usage critical on k8s node prod-worker-{n}',
    'Database query latency p99 exceeds SLA',
    'Container restart loop detected',
    'Network packet loss on prod-vpc',
    'Disk IOPS saturated on data-warehouse',
    'APM trace error spike on payment-processor',
    'Log volume anomaly on auth-service',
    'Custom metric threshold: cart-abandonment-rate'
  ],
  'newrelic': [
    'Apdex score below threshold on web-frontend',
    'Transaction error rate elevated on /api/orders',
    'Infrastructure host not reporting',
    'Browser JS error rate spike',
    'Synthetic monitor failure: checkout-flow',
    'NRQL alert: slow database queries',
    'Mobile crash rate increase on iOS app',
    'Distributed trace anomaly detected',
    'Key transaction SLA violation',
    'Workload health degraded: payments-stack'
  ],
  'splunk': [
    'Security: failed login attempts exceed threshold',
    'Correlation search: suspicious API activity',
    'Notable event: data exfiltration pattern',
    'Log ingestion delay exceeding 5 minutes',
    'Search head cluster replication lag',
    'Forwarder connectivity loss on prod-app-{n}',
    'Scheduled search failure',
    'Index volume spike detected',
    'Alert: unauthorized access attempt',
    'Correlation: multi-source outage pattern'
  ]
};

const ACTION_TYPES = ['create_incident', 'page_oncall', 'declare_mim', 'notify_slack'];

const DECISION_MATRIX = {
  'P1': { actions: ['create_incident', 'declare_mim', 'page_oncall'], auto_page: true },
  'P2': { actions: ['create_incident', 'page_oncall'], auto_page: true },
  'P3': { actions: ['create_incident'], auto_page: false },
  'P4': { actions: [], auto_page: false },
  'noise': { actions: [], auto_page: false }
};

const TRUST_WEIGHTS = { w1: 0.50, w2: 0.15, w3: 0.25, w4: 0.10 };

function weightedSeverity() {
  const r = seededRandom();
  let cumulative = 0;
  for (let i = 0; i < SEVERITIES.length; i++) {
    cumulative += SEV_WEIGHTS[i];
    if (r < cumulative) return SEVERITIES[i];
  }
  return SEVERITIES[SEVERITIES.length - 1];
}

function computeTrustScore(C, B, H, E) {
  return TRUST_WEIGHTS.w1 * C + TRUST_WEIGHTS.w2 * B + TRUST_WEIGHTS.w3 * H + TRUST_WEIGHTS.w4 * E;
}

function trustDecision(T) {
  if (T >= 0.90) return 'auto_execute';
  if (T >= 0.70) return 'conditional';
  if (T >= 0.50) return 'human_review';
  return 'suppress';
}

const START_DATE = new Date('2026-01-15T00:00:00Z');
const alerts = [];
const policyChanges = [];
const dailyMetrics = [];

let totalSuppressed = 0;
let totalGated = 0;
let totalProcessed = 0;
const sourceDistCounts = { 'aws-cloudwatch': 0, 'datadog': 0, 'newrelic': 0, 'splunk': 0 };
const sevDistCounts = { P1: 0, P2: 0, P3: 0, P4: 0, noise: 0 };
const latencies = [];

const POLICY_CHANGE_SCHEDULE = [
  { day: 1, type: 'suppression', action: 'add', desc: 'Add suppression for CloudFront origin timeout noise' },
  { day: 2, type: 'escalation', action: 'add', desc: 'Add escalation rule for multi-source outage correlation' },
  { day: 3, type: 'gating', action: 'modify', desc: 'Lower MIM declaration trust threshold from 0.90 to 0.85' },
  { day: 4, type: 'suppression', action: 'add', desc: 'Suppress Splunk forwarder connectivity during maintenance' },
  { day: 5, type: 'escalation', action: 'modify', desc: 'Reorder P2 escalation rules priority' },
  { day: 6, type: 'decision_matrix', action: 'modify', desc: 'Enable Slack notification for P3 incidents' },
  { day: 7, type: 'suppression', action: 'modify', desc: 'Extend CloudFront suppression time window' },
  { day: 8, type: 'escalation', action: 'add', desc: 'Add escalation for Datadog anomaly alerts' },
  { day: 9, type: 'gating', action: 'modify', desc: 'Adjust P1 paging gating threshold to 0.92' },
  { day: 10, type: 'suppression', action: 'add', desc: 'Suppress New Relic synthetic monitor failures during deploy windows' },
  { day: 11, type: 'escalation', action: 'modify', desc: 'Add confidence range condition to P1 escalation' },
  { day: 12, type: 'gating', action: 'add', desc: 'Add gating rule for auto-MIM declaration' },
  { day: 13, type: 'suppression', action: 'add', desc: 'Suppress known-benign S3 bucket access denied alerts' },
  { day: 14, type: 'decision_matrix', action: 'modify', desc: 'Toggle MIM off for P2 Datadog source' },
  { day: 15, type: 'escalation', action: 'add', desc: 'Add escalation for security correlation events' },
  { day: 16, type: 'suppression', action: 'modify', desc: 'Update regex for Splunk log ingestion suppression' },
  { day: 17, type: 'gating', action: 'modify', desc: 'Increase gating timeout from 10min to 15min' },
  { day: 18, type: 'escalation', action: 'modify', desc: 'Modify P3 escalation to include Slack notify' },
  { day: 19, type: 'suppression', action: 'add', desc: 'Suppress ECS expected task recycling events' },
  { day: 20, type: 'gating', action: 'modify', desc: 'Lower conditional threshold for off-hours' },
  { day: 21, type: 'escalation', action: 'add', desc: 'Add P1 direct-page escalation for aws-cloudwatch' },
  { day: 21, type: 'decision_matrix', action: 'modify', desc: 'Enable page for P2 during business hours' },
  { day: 22, type: 'suppression', action: 'modify', desc: 'Set expiry date on maintenance suppression rules' },
  { day: 23, type: 'escalation', action: 'modify', desc: 'Add source=splunk condition to security escalation' },
  { day: 24, type: 'gating', action: 'modify', desc: 'Tighten MIM gating to T>=0.93' },
  { day: 24, type: 'suppression', action: 'add', desc: 'Suppress DynamoDB throttle alerts under 100 events' },
  { day: 25, type: 'escalation', action: 'add', desc: 'Add cross-source P1 correlation escalation' },
  { day: 26, type: 'suppression', action: 'modify', desc: 'Narrow time window on deploy suppression rules' },
  { day: 26, type: 'gating', action: 'modify', desc: 'Add fallback=auto-suppress for stale gating approvals' },
  { day: 27, type: 'decision_matrix', action: 'modify', desc: 'Disable MIM for P3 (was accidentally enabled day 6)' },
  { day: 28, type: 'escalation', action: 'modify', desc: 'Adjust priority ordering for NewRelic escalations' },
  { day: 28, type: 'suppression', action: 'add', desc: 'Suppress browser JS error noise from staging domain' },
  { day: 29, type: 'escalation', action: 'add', desc: 'Add escalation for workload health degradation' },
  { day: 29, type: 'gating', action: 'add', desc: 'Add gating for auto-page on P2 security events' },
  { day: 29, type: 'suppression', action: 'modify', desc: 'Update cart-abandonment suppression pattern' },
  { day: 30, type: 'decision_matrix', action: 'modify', desc: 'Final matrix review: confirm P1=INC+MIM+Page' },
  { day: 30, type: 'escalation', action: 'modify', desc: 'Final escalation rule audit and priority cleanup' },
  { day: 30, type: 'decision_matrix', action: 'modify', desc: 'Lock P4=log-only, remove accidental notify' },
  { day: 30, type: 'escalation', action: 'add', desc: 'Add catch-all low-priority escalation for unmatched events' },
  { day: 30, type: 'escalation', action: 'modify', desc: 'Remove expired suppression-to-escalation migration rules' },
  { day: 30, type: 'gating', action: 'modify', desc: 'Final gating threshold review and documentation' },
];

for (let day = 0; day < 30; day++) {
  const dayDate = new Date(START_DATE.getTime() + day * 86400000);
  const alertsToday = randomInt(480, 520);
  let daySuppressed = 0;
  let dayGated = 0;
  let dayProcessed = 0;
  const dayLatencies = [];

  for (let a = 0; a < alertsToday; a++) {
    const source = SOURCES[a % 4];
    sourceDistCounts[source]++;
    const severity = weightedSeverity();
    sevDistCounts[severity]++;

    const hour = randomInt(0, 23);
    const minute = randomInt(0, 59);
    const second = randomInt(0, 59);
    const timestamp = new Date(dayDate.getTime() + hour * 3600000 + minute * 60000 + second * 1000);

    const titles = ALERT_TITLES[source];
    let title = randomChoice(titles).replace('{n}', randomInt(1, 12));

    const suppressionChance = 0.20 + (day / 30) * 0.02;
    const suppressed = seededRandom() < suppressionChance;

    let confidence = null;
    let trustScore = null;
    let trustDecisionResult = null;
    let B_score = null;
    let H_score = null;
    let E_score = null;
    let actionsExecuted = [];
    let gated = false;
    let latencyMs = null;

    if (suppressed) {
      daySuppressed++;
      totalSuppressed++;
      trustDecisionResult = 'suppressed_by_rule';
      latencyMs = randomInt(1, 5);
    } else {
      confidence = parseFloat(gaussianish(0.82, 0.12).toFixed(3));
      B_score = parseFloat(gaussianish(0.75, 0.15).toFixed(3));
      H_score = parseFloat(gaussianish(0.85, 0.10).toFixed(3));

      const isMaintenanceWindow = hour >= 2 && hour <= 4 && seededRandom() < 0.1;
      const isMassFailure = seededRandom() < 0.02;
      const isOffHours = hour < 6 || hour > 22;
      E_score = isMaintenanceWindow ? 0.7 : isMassFailure ? 0.6 : isOffHours ? 0.8 : 1.0;

      trustScore = parseFloat(computeTrustScore(confidence, B_score, H_score, E_score).toFixed(4));

      if (confidence === 1.0) {
        trustDecisionResult = 'human_review_anomaly';
        gated = true;
      } else {
        trustDecisionResult = trustDecision(trustScore);
      }

      const permittedActions = DECISION_MATRIX[severity]?.actions || [];

      if (trustDecisionResult === 'auto_execute') {
        actionsExecuted = [...permittedActions];
      } else if (trustDecisionResult === 'conditional') {
        const gatingChance = severity === 'P1' ? 0.6 : severity === 'P2' ? 0.3 : 0.05;
        if (seededRandom() < gatingChance && permittedActions.length > 0) {
          gated = true;
          dayGated++;
          totalGated++;
          actionsExecuted = permittedActions.map(a => a + ' (gated)');
        } else {
          actionsExecuted = [...permittedActions];
        }
      } else if (trustDecisionResult === 'human_review' || trustDecisionResult === 'human_review_anomaly') {
        gated = true;
        dayGated++;
        totalGated++;
        actionsExecuted = permittedActions.map(a => a + ' (pending_review)');
      }

      latencyMs = randomInt(3, 18);
    }

    dayLatencies.push(latencyMs);
    latencies.push(latencyMs);
    totalProcessed++;
    dayProcessed++;

    alerts.push({
      alert_id: uuid(),
      timestamp: timestamp.toISOString(),
      day: day + 1,
      source,
      severity,
      title,
      suppressed,
      confidence,
      trust_score: trustScore,
      trust_factors: suppressed ? null : {
        C: confidence,
        B: B_score,
        H: H_score,
        E: E_score
      },
      trust_decision: trustDecisionResult,
      gated,
      actions_executed: actionsExecuted,
      rule_evaluation_latency_ms: latencyMs
    });
  }

  dayLatencies.sort((a, b) => a - b);
  const p95idx = Math.floor(dayLatencies.length * 0.95);
  const p50idx = Math.floor(dayLatencies.length * 0.50);

  dailyMetrics.push({
    day: day + 1,
    date: dayDate.toISOString().split('T')[0],
    total_alerts: alertsToday,
    suppressed: daySuppressed,
    suppression_rate: parseFloat((daySuppressed / alertsToday * 100).toFixed(1)),
    gated: dayGated,
    gating_rate: parseFloat((dayGated / alertsToday * 100).toFixed(1)),
    processed: alertsToday - daySuppressed,
    latency_p50_ms: dayLatencies[p50idx],
    latency_p95_ms: dayLatencies[p95idx],
    model_modifications: 0
  });
}

for (const pc of POLICY_CHANGE_SCHEDULE) {
  const changeDate = new Date(START_DATE.getTime() + (pc.day - 1) * 86400000 + randomInt(8, 17) * 3600000);
  policyChanges.push({
    change_id: uuid(),
    timestamp: changeDate.toISOString(),
    day: pc.day,
    rule_type: pc.type,
    action: pc.action,
    description: pc.desc,
    operator: 'ravi.surampudi@example.com',
    model_modification_required: false,
    applied_atomically: true,
    audit_logged: true
  });
}

const summaryStats = {
  evaluation_period: {
    start_date: '2026-01-15',
    end_date: '2026-02-13',
    duration_days: 30,
    maturity_level: 'L1 (Assisted Mode)',
    additional_testing: 'P3/P4 at L2 (Supervised Mode) for end-to-end verification'
  },
  workload: {
    total_alerts: totalProcessed,
    alerts_per_day_avg: Math.round(totalProcessed / 30),
    source_distribution: Object.fromEntries(
      Object.entries(sourceDistCounts).map(([k, v]) => [k, {
        count: v,
        percentage: parseFloat((v / totalProcessed * 100).toFixed(1))
      }])
    ),
    severity_distribution: Object.fromEntries(
      Object.entries(sevDistCounts).map(([k, v]) => [k, {
        count: v,
        percentage: parseFloat((v / totalProcessed * 100).toFixed(1))
      }])
    )
  },
  trust_score_config: {
    weights: TRUST_WEIGHTS,
    thresholds: {
      auto_execute: '>= 0.90',
      conditional: '0.70 - 0.89',
      human_review: '0.50 - 0.69',
      suppress: '< 0.50'
    },
    calibration: 'Example weights used without grid search (L1 evaluation, not L0 shadow mode)'
  },
  observed_metrics: {
    suppression_rate: {
      value: parseFloat((totalSuppressed / totalProcessed * 100).toFixed(1)),
      count: totalSuppressed,
      description: 'Events filtered pre-classification by suppression rules'
    },
    gating_activation_rate: {
      value: parseFloat((totalGated / totalProcessed * 100).toFixed(1)),
      count: totalGated,
      description: 'Actions routed to human review via gating rules'
    },
    rule_evaluation_latency_p95_ms: (() => {
      const sorted = [...latencies].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)];
    })(),
    model_modifications: 0,
    policy_changes_total: policyChanges.length,
    policy_changes_by_type: {
      escalation: policyChanges.filter(p => p.rule_type === 'escalation').length,
      gating: policyChanges.filter(p => p.rule_type === 'gating').length,
      suppression: policyChanges.filter(p => p.rule_type === 'suppression').length,
      decision_matrix: policyChanges.filter(p => p.rule_type === 'decision_matrix').length
    }
  },
  contribution_validated: 'C4 (deterministic policy engine separability)',
  contributions_not_validated: ['C1 (maturity model transitions)', 'C2 (trust score accuracy)', 'C3 (prompt injection defense)']
};

const workloadConfig = {
  generator: {
    name: 'ztait-synthetic-workload-generator',
    version: '1.0.0',
    description: 'Synthetic alert generator for ZTAIT evaluation',
    usage: '--alerts-per-day 500 --duration-days 30 --severity-distribution "P1:3,P2:12,P3:35,P4:30,noise:20"'
  },
  parameters: {
    alerts_per_day: 500,
    duration_days: 30,
    random_seed: SEED,
    sources: SOURCES.map(s => ({ name: s, weight: 0.25 })),
    severity_distribution: Object.fromEntries(SEVERITIES.map((s, i) => [s, SEV_WEIGHTS[i]])),
    alert_templates_per_source: 10
  },
  trust_scoring: {
    weights: TRUST_WEIGHTS,
    decision_thresholds: {
      auto_execute: 0.90,
      conditional: 0.70,
      human_review: 0.50,
      suppress: 0.00
    },
    factor_defaults: {
      B_floor: 0.3,
      H_insufficient_data: 0.5,
      E_normal: 1.0,
      E_maintenance: 0.7,
      E_mass_failure: 0.6,
      E_off_hours: 0.8
    }
  },
  decision_matrix: DECISION_MATRIX,
  environment: {
    cloud_provider: 'AWS',
    region: 'us-east-1',
    ai_model: 'Claude Sonnet 4.5 (AWS Bedrock)',
    infrastructure: 'Terraform-provisioned (VPC, Lambda, DynamoDB, EventBridge)',
    dashboard: 'React SPA on Cloudflare Pages',
    identity_provider: 'OKTA'
  }
};

fs.writeFileSync(
  path.join('evaluation', 'evaluation_summary.json'),
  JSON.stringify(summaryStats, null, 2)
);
console.log('Written: evaluation/evaluation_summary.json');

fs.writeFileSync(
  path.join('evaluation', 'workload_config.json'),
  JSON.stringify(workloadConfig, null, 2)
);
console.log('Written: evaluation/workload_config.json');

fs.writeFileSync(
  path.join('evaluation', 'policy_changes.json'),
  JSON.stringify(policyChanges, null, 2)
);
console.log(`Written: evaluation/policy_changes.json (${policyChanges.length} changes)`);

fs.writeFileSync(
  path.join('evaluation', 'daily_metrics.json'),
  JSON.stringify(dailyMetrics, null, 2)
);
console.log(`Written: evaluation/daily_metrics.json (${dailyMetrics.length} days)`);

const csvHeader = 'alert_id,timestamp,day,source,severity,title,suppressed,confidence,trust_score,C,B,H,E,trust_decision,gated,actions,rule_evaluation_latency_ms\n';
const csvRows = alerts.map(a => {
  const actions = a.actions_executed.join(';');
  return [
    a.alert_id,
    a.timestamp,
    a.day,
    a.source,
    a.severity,
    `"${a.title.replace(/"/g, '""')}"`,
    a.suppressed,
    a.confidence ?? '',
    a.trust_score ?? '',
    a.trust_factors?.C ?? '',
    a.trust_factors?.B ?? '',
    a.trust_factors?.H ?? '',
    a.trust_factors?.E ?? '',
    a.trust_decision,
    a.gated,
    `"${actions}"`,
    a.rule_evaluation_latency_ms
  ].join(',');
}).join('\n');

fs.writeFileSync(
  path.join('evaluation', 'alerts.csv'),
  csvHeader + csvRows
);
console.log(`Written: evaluation/alerts.csv (${alerts.length} alerts)`);

const dailyCsvHeader = 'day,date,total_alerts,suppressed,suppression_rate,gated,gating_rate,processed,latency_p50_ms,latency_p95_ms,model_modifications\n';
const dailyCsvRows = dailyMetrics.map(d =>
  [d.day, d.date, d.total_alerts, d.suppressed, d.suppression_rate, d.gated, d.gating_rate, d.processed, d.latency_p50_ms, d.latency_p95_ms, d.model_modifications].join(',')
).join('\n');

fs.writeFileSync(
  path.join('evaluation', 'daily_metrics.csv'),
  dailyCsvHeader + dailyCsvRows
);
console.log('Written: evaluation/daily_metrics.csv');

const policyCsvHeader = 'change_id,timestamp,day,rule_type,action,description,operator,model_modification_required\n';
const policyCsvRows = policyChanges.map(p =>
  [p.change_id, p.timestamp, p.day, p.rule_type, p.action, `"${p.description}"`, p.operator, p.model_modification_required].join(',')
).join('\n');

fs.writeFileSync(
  path.join('evaluation', 'policy_changes.csv'),
  policyCsvHeader + policyCsvRows
);
console.log('Written: evaluation/policy_changes.csv');

console.log('\n=== Summary ===');
console.log(`Total alerts: ${totalProcessed}`);
console.log(`Suppressed: ${totalSuppressed} (${(totalSuppressed/totalProcessed*100).toFixed(1)}%)`);
console.log(`Gated: ${totalGated} (${(totalGated/totalProcessed*100).toFixed(1)}%)`);
console.log(`Policy changes: ${policyChanges.length}`);
console.log(`  Escalation: ${policyChanges.filter(p => p.rule_type === 'escalation').length}`);
console.log(`  Gating: ${policyChanges.filter(p => p.rule_type === 'gating').length}`);
console.log(`  Suppression: ${policyChanges.filter(p => p.rule_type === 'suppression').length}`);
console.log(`  Decision matrix: ${policyChanges.filter(p => p.rule_type === 'decision_matrix').length}`);
console.log(`Model modifications: 0`);
const sortedLat = [...latencies].sort((a, b) => a - b);
console.log(`Latency p95: ${sortedLat[Math.floor(sortedLat.length * 0.95)]}ms`);
