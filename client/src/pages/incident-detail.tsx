import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClassificationBadge,
  StatusBadge,
  ConfidenceBar,
  SourceBadge,
} from "@/components/status-indicator";
import {
  ArrowLeft,
  ExternalLink,
  Brain,
  Shield,
  Clock,
  Hash,
  Server,
  User,
  FileText,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Incident, AuditLog } from "@shared/schema";

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const { toast } = useToast();

  const { data: incident, isLoading } = useQuery<Incident>({
    queryKey: ["/api/incidents", params?.id],
    enabled: !!params?.id,
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit", params?.id],
    enabled: !!params?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiRequest("PATCH", `/api/incidents/${params?.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit", params?.id] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 overflow-y-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Incident not found</p>
        <Link href="/incidents">
          <Button variant="outline" className="mt-4" data-testid="button-back-to-incidents">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Incidents
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/incidents">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate" data-testid="text-incident-title">
            {incident.title}
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            {incident.correlationId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select
            value={incident.status}
            onValueChange={(v) => updateStatusMutation.mutate(v)}
          >
            <SelectTrigger className="w-[160px]" data-testid="select-update-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="triaging">Triaging</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="suppressed">Suppressed</SelectItem>
              <SelectItem value="human-review">Human Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm" data-testid="text-incident-description">{incident.description}</p>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Source</p>
                  <SourceBadge source={incident.source} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Classification</p>
                  <ClassificationBadge classification={incident.classification} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <StatusBadge status={incident.status} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Priority</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {incident.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-xs font-mono">
                    {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>
                {incident.assignmentGroup && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Assignment Group</p>
                    <Badge variant="outline" className="text-xs">
                      {incident.assignmentGroup}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI Classification Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Confidence Score</p>
                <ConfidenceBar confidence={incident.confidence} />
              </div>
              {incident.aiReasoning && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">AI Reasoning</p>
                  <div className="p-3 rounded-md bg-accent/50 text-sm font-mono text-sm leading-relaxed" data-testid="text-ai-reasoning">
                    {incident.aiReasoning}
                  </div>
                </div>
              )}
              {incident.escalationAction && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Recommended Action</p>
                  <Badge variant="secondary" className="text-xs">
                    {incident.escalationAction}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {incident.rawPayload && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Raw Payload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-3 rounded-md bg-accent/50 text-xs font-mono overflow-x-auto whitespace-pre-wrap" data-testid="text-raw-payload">
                  {JSON.stringify(incident.rawPayload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Integration IDs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incident.snowId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">ServiceNow</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {incident.snowId}
                  </Badge>
                </div>
              )}
              {incident.pdId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">PagerDuty</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {incident.pdId}
                  </Badge>
                </div>
              )}
              {incident.mimId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">MIM</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {incident.mimId}
                  </Badge>
                </div>
              )}
              {!incident.snowId && !incident.pdId && !incident.mimId && (
                <p className="text-xs text-muted-foreground">No external integrations linked</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-3" data-testid={`audit-log-${log.id}`}>
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <div className="w-px flex-1 bg-border" />
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {log.actor}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{log.detail}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No audit entries</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
