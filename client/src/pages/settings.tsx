import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Shield, Zap, Clock, Gauge, CheckCircle2, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SystemSettings } from "@shared/schema";

const maturityLevels = [
  {
    level: 0,
    title: "Manual Triage",
    description: "All incidents are reviewed and classified by human operators. No automation.",
    features: ["Manual classification", "Human routing", "Email-based escalation"],
  },
  {
    level: 1,
    title: "Alert-Driven Ticket Creation",
    description: "Automated ticket creation from alert sources. Classification remains manual.",
    features: ["Auto-ticket creation", "Source normalization", "Basic deduplication"],
  },
  {
    level: 2,
    title: "AI-Assisted Classification",
    description: "AI provides classification suggestions. Humans approve before action.",
    features: [
      "AI classification suggestions",
      "Confidence scoring",
      "Human approval required",
      "Context enrichment",
    ],
  },
  {
    level: 3,
    title: "Autonomous Orchestration",
    description: "Full AI-driven triage with policy governance. Target state.",
    features: [
      "Autonomous classification",
      "Policy-governed escalation",
      "Auto-MIM triggering",
      "Zero-trust enforcement",
      "Full audit trail",
    ],
  },
];

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SystemSettings>) => {
      await apiRequest("PATCH", "/api/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated" });
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

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          System configuration and maturity model
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Maturity Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-1 mb-2">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  level <= (settings?.maturityLevel ?? 0)
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {maturityLevels.map((ml) => {
              const isActive = settings?.maturityLevel === ml.level;
              const isAvailable = ml.level <= (settings?.maturityLevel ?? 0);
              return (
                <Card
                  key={ml.level}
                  className={`cursor-pointer transition-colors ${
                    isActive ? "border-primary" : ""
                  } hover-elevate`}
                  onClick={() =>
                    updateMutation.mutate({ maturityLevel: ml.level })
                  }
                  data-testid={`card-maturity-${ml.level}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isActive ? "default" : "outline"}
                          className="text-xs font-mono"
                        >
                          L{ml.level}
                        </Badge>
                        <h3 className="text-sm font-medium">{ml.title}</h3>
                      </div>
                      {isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ml.description}
                    </p>
                    <div className="space-y-1">
                      {ml.features.map((f) => (
                        <div
                          key={f}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        >
                          <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Escalation Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Auto Escalation</p>
                <p className="text-xs text-muted-foreground">
                  Automatically escalate high-confidence incidents
                </p>
              </div>
              <Switch
                checked={settings?.autoEscalation ?? false}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ autoEscalation: checked })
                }
                data-testid="switch-auto-escalation"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">MIM Gating</p>
                <p className="text-xs text-muted-foreground">
                  Require two-signal confirmation for MIM triggers
                </p>
              </div>
              <Switch
                checked={settings?.mimGating ?? true}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({ mimGating: checked })
                }
                data-testid="switch-mim-gating"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Confidence Threshold</p>
                <Badge variant="outline" className="text-xs font-mono" data-testid="badge-confidence-threshold">
                  {Math.round((settings?.confidenceThreshold ?? 0.85) * 100)}%
                </Badge>
              </div>
              <Slider
                value={[Math.round((settings?.confidenceThreshold ?? 0.85) * 100)]}
                onValueCommit={([val]) =>
                  updateMutation.mutate({ confidenceThreshold: val / 100 })
                }
                min={50}
                max={99}
                step={1}
                data-testid="slider-confidence"
              />
              <p className="text-xs text-muted-foreground">
                Minimum confidence required for autonomous actions
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Deduplication Window</p>
                <Badge variant="outline" className="text-xs font-mono" data-testid="badge-dedup-window">
                  {settings?.deduplicationWindow ?? 300}s
                </Badge>
              </div>
              <Slider
                value={[settings?.deduplicationWindow ?? 300]}
                onValueCommit={([val]) =>
                  updateMutation.mutate({ deduplicationWindow: val })
                }
                min={60}
                max={900}
                step={30}
                data-testid="slider-dedup"
              />
              <p className="text-xs text-muted-foreground">
                Time window for suppressing duplicate alerts (seconds)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
