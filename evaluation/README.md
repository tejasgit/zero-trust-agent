# ZTAIT Evaluation Data

Supplementary data for the paper: *ZTAIT: A Zero-Trust Framework for Governing Autonomous AI Agents in Enterprise Incident Response* (Section 7.1).

## Overview

30-day controlled lab evaluation using synthetic workloads. Maturity Level 1 (Assisted Mode) with P3/P4 additionally tested at Level 2. Validates contribution C4 (deterministic policy engine separability).

## Files

### Summary and Configuration

| File | Description |
|---|---|
| `evaluation_summary.json` | Aggregate metrics, source/severity distributions, trust score config, observed results |
| `workload_config.json` | Generator parameters, trust scoring weights/thresholds, decision matrix, environment details |

### Alert Data

| File | Description |
|---|---|
| `alerts.csv` | All ~15,000 individual alerts with trust scores, factors (C/B/H/E), decisions, actions, latency |
| `daily_metrics.csv` | Per-day aggregates: alert counts, suppression/gating rates, latency percentiles |
| `daily_metrics.json` | Same as CSV in JSON format |

### Policy Changes

| File | Description |
|---|---|
| `policy_changes.csv` | All 41 policy changes with timestamps, rule types, descriptions, operator identity |
| `policy_changes.json` | Same as CSV in JSON format |

### Generator

| File | Description |
|---|---|
| `generate_evaluation_data.cjs` | Node.js script to regenerate all data files (deterministic, seeded) |

## Key Metrics (from paper Section 7.1)

| Metric | Value |
|---|---|
| Total alerts | ~15,000 |
| Duration | 30 days |
| Sources | AWS CloudWatch, Datadog, New Relic, Splunk (25% each) |
| Severity distribution | P1: 3%, P2: 12%, P3: 35%, P4: 30%, noise: 20% |
| Suppression rate | ~22% |
| Gating activation rate | ~8% (of actions) |
| Rule evaluation latency (p95) | < 15 ms |
| Policy changes | 41 (14 escalation, 9 gating, 12 suppression, 6 decision matrix) |
| Model modifications | 0 |

## Trust Score Configuration

- Weights: w1=0.50 (confidence), w2=0.15 (behavioral), w3=0.25 (historical), w4=0.10 (environmental)
- Thresholds: >= 0.90 auto-execute, 0.70-0.89 conditional, 0.50-0.69 human review, < 0.50 suppress

## Regenerating Data

```bash
node evaluation/generate_evaluation_data.cjs
```

Uses a fixed random seed (42) for reproducibility. All output files are deterministic.

## CSV Column Reference

### alerts.csv

| Column | Description |
|---|---|
| `alert_id` | Unique identifier (UUID) |
| `timestamp` | ISO 8601 timestamp |
| `day` | Evaluation day (1-30) |
| `source` | Monitoring platform (aws-cloudwatch, datadog, newrelic, splunk) |
| `severity` | AI classification (P1, P2, P3, P4, noise) |
| `title` | Alert title (derived from production patterns) |
| `suppressed` | Whether filtered by suppression rule before classification |
| `confidence` | Model confidence C(i) in [0.0, 1.0], null if suppressed |
| `trust_score` | Composite trust score T(i), null if suppressed |
| `C` | Trust factor: Model Confidence |
| `B` | Trust factor: Behavioral Consistency |
| `H` | Trust factor: Historical Accuracy |
| `E` | Trust factor: Environmental Context |
| `trust_decision` | auto_execute, conditional, human_review, suppressed_by_rule |
| `gated` | Whether routed to human approval |
| `actions` | Actions executed or pending (semicolon-separated) |
| `rule_evaluation_latency_ms` | Policy engine evaluation time in milliseconds |

## License

MIT (Personal Use Only). See main repository LICENSE.
