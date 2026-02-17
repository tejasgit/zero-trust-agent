import { cn } from "@/lib/utils";

const classificationColors: Record<string, string> = {
  noise: "bg-muted text-muted-foreground",
  low: "bg-chart-2/15 text-chart-2 dark:bg-chart-2/20",
  medium: "bg-chart-4/15 text-chart-4 dark:bg-chart-4/20",
  high: "bg-destructive/15 text-destructive dark:bg-destructive/20",
  sev1: "bg-destructive text-destructive-foreground",
  unclassified: "bg-muted text-muted-foreground",
};

const statusColors: Record<string, string> = {
  open: "bg-chart-4/15 text-chart-4 dark:bg-chart-4/20",
  triaging: "bg-primary/15 text-primary dark:bg-primary/20",
  escalated: "bg-destructive/15 text-destructive dark:bg-destructive/20",
  resolved: "bg-chart-2/15 text-chart-2 dark:bg-chart-2/20",
  suppressed: "bg-muted text-muted-foreground",
  "human-review": "bg-chart-3/15 text-chart-3 dark:bg-chart-3/20",
};

const sourceIcons: Record<string, string> = {
  salesforce: "SF",
  snaplogic: "SL",
  aws: "AWS",
  aem: "AEM",
  splunk: "SPL",
  cloudwatch: "CW",
  newrelic: "NR",
};

export function ClassificationBadge({ classification }: { classification: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium uppercase tracking-wider",
        classificationColors[classification] || classificationColors.unclassified
      )}
      data-testid={`badge-classification-${classification}`}
    >
      {classification}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize",
        statusColors[status] || statusColors.open
      )}
      data-testid={`badge-status-${status}`}
    >
      {status}
    </span>
  );
}

export function SourceBadge({ source }: { source: string }) {
  const label = sourceIcons[source.toLowerCase()] || source.slice(0, 3).toUpperCase();
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-accent text-accent-foreground"
      data-testid={`badge-source-${source}`}
    >
      {label}
    </span>
  );
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 85 ? "bg-chart-2" : pct >= 60 ? "bg-chart-4" : "bg-destructive";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}

export function PulsingDot({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chart-2 opacity-75" />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2.5 w-2.5",
          active ? "bg-chart-2" : "bg-muted-foreground"
        )}
      />
    </span>
  );
}
