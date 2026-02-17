import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Shield, Gauge, GitBranch, AlertTriangle, Lock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PolicyRule } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  escalation: Gauge,
  gating: Lock,
  suppression: GitBranch,
  validation: Shield,
};

const categoryColors: Record<string, string> = {
  escalation: "bg-chart-4/15 text-chart-4",
  gating: "bg-primary/15 text-primary",
  suppression: "bg-muted text-muted-foreground",
  validation: "bg-chart-2/15 text-chart-2",
};

export default function Policies() {
  const { toast } = useToast();

  const { data: policies, isLoading } = useQuery<PolicyRule[]>({
    queryKey: ["/api/policies"],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/policies/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({ title: "Policy updated" });
    },
  });

  const grouped = policies?.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, PolicyRule[]>);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Policy Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Deterministic escalation rules and governance controls
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-chart-4/15">
              <AlertTriangle className="w-4 h-4 text-chart-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Governance Notice</p>
              <p className="text-xs text-muted-foreground">
                Policy changes are logged in the audit trail. No automatic incident closure is permitted.
                All MIM triggers require two-signal confirmation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : grouped ? (
        Object.entries(grouped).map(([category, rules]) => {
          const Icon = categoryIcons[category] || Shield;
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium capitalize">{category} Rules</h2>
                <Badge variant="outline" className="text-xs">
                  {rules.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <Card key={rule.id} data-testid={`card-policy-${rule.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-medium">{rule.name}</h3>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${
                                categoryColors[rule.category] || ""
                              }`}
                            >
                              {rule.category}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {rule.description}
                          </p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Condition:</span>
                              <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded">
                                {rule.condition}
                              </code>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Action:</span>
                              <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded">
                                {rule.action}
                              </code>
                            </div>
                            {rule.threshold !== null && rule.threshold !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Threshold:</span>
                                <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded">
                                  {Math.round(rule.threshold * 100)}%
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: rule.id, enabled: checked })
                          }
                          data-testid={`switch-policy-${rule.id}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No policies configured</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
