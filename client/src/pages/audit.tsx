import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText, Search, Shield } from "lucide-react";
import { Link } from "wouter";
import type { AuditLog } from "@shared/schema";

export default function AuditTrail() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: auditLogs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const filtered = auditLogs
    ?.filter((log) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q) ||
        (log.correlationId && log.correlationId.toLowerCase().includes(q))
      );
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const actionColors: Record<string, string> = {
    create: "bg-chart-2/15 text-chart-2",
    classify: "bg-primary/15 text-primary",
    escalate: "bg-chart-4/15 text-chart-4",
    resolve: "bg-chart-2/15 text-chart-2",
    suppress: "bg-muted text-muted-foreground",
    "mim-trigger": "bg-destructive/15 text-destructive",
    "status-change": "bg-chart-3/15 text-chart-3",
    "policy-change": "bg-chart-4/15 text-chart-4",
  };

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete decision log with correlation tracking
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search audit logs by action, actor, or detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-audit"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4"
                  data-testid={`audit-row-${log.id}`}
                >
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
                          actionColors[log.action] || "bg-accent text-accent-foreground"
                        }`}
                      >
                        {log.action}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {log.actor}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{log.detail}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {log.correlationId && (
                        <span className="text-xs font-mono text-muted-foreground">
                          CID: {log.correlationId}
                        </span>
                      )}
                      {log.incidentId && (
                        <Link href={`/incidents/${log.incidentId}`}>
                          <span className="text-xs text-primary cursor-pointer">
                            View Incident
                          </span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ScrollText className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
