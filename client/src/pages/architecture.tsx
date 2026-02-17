import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Zap, Brain, GitBranch, CheckCircle2, AlertTriangle,
  Server, Database, Radio, ArrowRight, ArrowDown, Lock, Eye, Cog,
} from "lucide-react";

interface PipelineStageProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badges: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" }[];
  items: string[];
  color: string;
  testId: string;
}

function PipelineStage({ title, subtitle, icon, badges, items, color, testId }: PipelineStageProps) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center justify-center w-10 h-10 rounded-md ${color}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold" data-testid={`${testId}-title`}>{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {badges.map((b, i) => (
            <Badge key={i} variant={b.variant || "outline"} className="text-xs">
              {b.label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0 text-chart-2" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FlowArrow({ label, vertical }: { label: string; vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-1">
        <ArrowDown className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-1 shrink-0">
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{label}</span>
    </div>
  );
}

export default function Architecture() {
  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Architecture
        </h1>
        <p className="text-sm text-muted-foreground">
          Zero-Trust Autonomous Incident Triage Pipeline - AWS Bedrock + VPC Architecture
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Triage Pipeline Flow
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-start">
          <PipelineStage
            testId="stage-ingestion"
            title="1. Ingestion Layer"
            subtitle="API Gateway + Lambda"
            icon={<Radio className="w-5 h-5 text-primary-foreground" />}
            color="bg-primary"
            badges={[{ label: "HMAC Validated" }, { label: "EventBridge" }]}
            items={[
              "Webhook receiver with HMAC-SHA256 signature verification",
              "Anti-replay protection with 5-min timestamp window",
              "EventBridge routing with deduplication (idempotency key)",
              "Suppression rules evaluated before triage",
            ]}
          />
          <FlowArrow label="event" />
          <PipelineStage
            testId="stage-triage"
            title="2. AI Triage Engine"
            subtitle="AWS Bedrock (Claude Sonnet 4.5)"
            icon={<Brain className="w-5 h-5 text-primary-foreground" />}
            color="bg-chart-4"
            badges={[{ label: "Bedrock Guardrails" }, { label: "Structured Output" }]}
            items={[
              "Structured prompts with XML tags (anti-injection layer 2)",
              "5-layer prompt injection defense: sanitize, structure, guardrail, validate, monitor",
              "Decision matrix evaluation with P1-P4 severity mapping",
              "Confidence scoring with classification reasoning trace",
            ]}
          />
          <FlowArrow label="decision" />
          <PipelineStage
            testId="stage-actions"
            title="3. Action Orchestrator"
            subtitle="Lambda + Secrets Manager"
            icon={<GitBranch className="w-5 h-5 text-primary-foreground" />}
            color="bg-chart-2"
            badges={[{ label: "Gated" }, { label: "Audit Logged" }]}
            items={[
              "Gating rules enforce human-in-the-loop for MIM/Page actions",
              "Escalation rules route by classification, source, and confidence",
              "ServiceNow INC, PagerDuty page, MIM bridge, Slack notifications",
              "Full audit trail with correlation IDs per decision chain",
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security Layers
          </h2>
          <div className="space-y-3">
            <Card data-testid="card-security-network">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-chart-4" />
                  <div>
                    <p className="text-sm font-medium">Network Isolation</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AWS VPC with private subnets, VPC endpoints for Bedrock/DynamoDB/Secrets Manager. No public internet egress from triage functions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-security-auth">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0 text-chart-2" />
                  <div>
                    <p className="text-sm font-medium">Authentication</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      OKTA OIDC federation for dashboard API. IAM roles with permission boundaries. API Gateway JWT authorizer validates every request.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-security-secrets">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Eye className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Secrets & Audit</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Secrets Manager with automatic rotation (30-day). CloudTrail for all API calls. DynamoDB audit log with immutable append-only design.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Cog className="w-4 h-4" />
            Infrastructure
          </h2>
          <div className="space-y-3">
            <Card data-testid="card-infra-compute">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Server className="w-4 h-4 mt-0.5 shrink-0 text-chart-4" />
                  <div>
                    <p className="text-sm font-medium">Compute</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lambda functions: webhook receiver, triage engine, action dispatcher, SNOW/PD/MIM/Slack integration handlers. Cold-start optimized with provisioned concurrency for P1 paths.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-infra-storage">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-4 h-4 mt-0.5 shrink-0 text-chart-2" />
                  <div>
                    <p className="text-sm font-medium">Storage</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      DynamoDB tables: incidents, audit_logs, rules (escalation/gating/suppression), decision_matrix. On-demand capacity with point-in-time recovery. GSIs for query patterns.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-infra-observability">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Observability</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      CloudWatch metrics/dashboards, SNS alarms for triage failures and confidence degradation. X-Ray distributed tracing across the full pipeline.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Prompt Injection Defense (5 Layers)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            { layer: "L1", title: "Input Sanitization", desc: "Strip control chars, HTML entities, injection markers" },
            { layer: "L2", title: "Structured Prompts", desc: "XML-tagged sections, system/user boundary enforcement" },
            { layer: "L3", title: "Bedrock Guardrails", desc: "Content filters, topic restrictions, PII redaction" },
            { layer: "L4", title: "Output Validation", desc: "JSON schema validation, enum checks, confidence bounds" },
            { layer: "L5", title: "Behavior Monitor", desc: "Anomaly detection on classification distribution drift" },
          ].map((layer, i) => (
            <Card key={i} data-testid={`card-defense-${layer.layer.toLowerCase()}`}>
              <CardContent className="p-3 text-center">
                <Badge variant="outline" className="mb-2 text-xs font-mono">{layer.layer}</Badge>
                <p className="text-xs font-medium">{layer.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{layer.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Threat Model (STRIDE)
        </h2>
        <Card data-testid="card-threat-model">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Threat</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "T1", threat: "Spoofed webhook events", cat: "Spoofing", mit: "HMAC-SHA256 + timestamp anti-replay" },
                    { id: "T2", threat: "Tampered alert payloads", cat: "Tampering", mit: "Signature verification, input sanitization" },
                    { id: "T3", threat: "Missing audit records", cat: "Repudiation", mit: "Immutable DynamoDB audit log, CloudTrail" },
                    { id: "T4", threat: "PII in incident data", cat: "Info Disclosure", mit: "Bedrock Guardrails PII redaction, VPC isolation" },
                    { id: "T5", threat: "Flood of fake alerts", cat: "Denial of Service", mit: "API Gateway throttling, EventBridge dedup" },
                    { id: "T9", threat: "Webhook replay attacks", cat: "Spoofing", mit: "5-min timestamp window, idempotency keys" },
                    { id: "T10", threat: "Data exfil via AI prompts", cat: "Info Disclosure", mit: "Structured prompts, output schema validation" },
                    { id: "T11", threat: "Insider rule misuse", cat: "Elevation", mit: "Audit trail, rule change approval workflow" },
                  ].map((t, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`row-threat-${t.id.toLowerCase()}`}>
                      <td className="p-3"><Badge variant="outline" className="font-mono text-xs">{t.id}</Badge></td>
                      <td className="p-3">{t.threat}</td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs">{t.cat}</Badge></td>
                      <td className="p-3 text-muted-foreground">{t.mit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
