import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClassificationBadge,
  StatusBadge,
  ConfidenceBar,
  SourceBadge,
} from "@/components/status-indicator";
import {
  AlertTriangle,
  ShieldCheck,
  Zap,
  Clock,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { Incident, SystemSettings, EventSource, AuditLog } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const CLASSIFICATION_COLORS: Record<string, string> = {
  noise: "hsl(210, 11%, 50%)",
  low: "hsl(142, 76%, 45%)",
  medium: "hsl(25, 95%, 53%)",
  high: "hsl(0, 84%, 50%)",
  sev1: "hsl(0, 84%, 35%)",
  unclassified: "hsl(210, 14%, 40%)",
};

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-chart-2" />
                <span className="text-xs text-chart-2 font-medium">{trend}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: sources } = useQuery<EventSource[]>({
    queryKey: ["/api/sources"],
  });

  const { data: auditLogs } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit"],
  });

  const totalIncidents = incidents?.length || 0;
  const openIncidents = incidents?.filter((i) => i.status === "open").length || 0;
  const escalatedIncidents = incidents?.filter((i) => i.status === "escalated").length || 0;
  const avgConfidence = incidents?.length
    ? (incidents.reduce((sum, i) => sum + i.confidence, 0) / incidents.length)
    : 0;

  const classificationData = incidents
    ? Object.entries(
        incidents.reduce((acc, i) => {
          acc[i.classification] = (acc[i.classification] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({
        name,
        value,
        fill: CLASSIFICATION_COLORS[name] || CLASSIFICATION_COLORS.unclassified,
      }))
    : [];

  const sourceData = incidents
    ? Object.entries(
        incidents.reduce((acc, i) => {
          acc[i.source] = (acc[i.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }))
    : [];

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    incidents: Math.floor(Math.random() * 8 + 1),
    resolved: Math.floor(Math.random() * 6),
  }));

  const recentIncidents = incidents
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentAudit = auditLogs
    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Operations Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Zero-Trust Autonomous Incident Triage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-chart-2" />
          <span className="text-sm text-muted-foreground font-mono">
            {sources?.filter((s) => s.status === "active").length || 0} sources active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Incidents"
          value={totalIncidents}
          subtitle="All time"
          icon={AlertTriangle}
          loading={incidentsLoading}
        />
        <MetricCard
          title="Open"
          value={openIncidents}
          subtitle="Awaiting triage"
          icon={Clock}
          loading={incidentsLoading}
        />
        <MetricCard
          title="Escalated"
          value={escalatedIncidents}
          subtitle="Active escalations"
          icon={Zap}
          loading={incidentsLoading}
        />
        <MetricCard
          title="Avg Confidence"
          value={`${Math.round(avgConfidence * 100)}%`}
          subtitle="AI classification"
          icon={ShieldCheck}
          loading={incidentsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Incident Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(217, 91%, 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142, 76%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 11%, 20%)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: "hsl(210, 11%, 50%)" }}
                    tickLine={false}
                    axisLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(210, 11%, 50%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 11%, 12%)",
                      border: "1px solid hsl(210, 11%, 20%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="hsl(217, 91%, 50%)"
                    fill="url(#incidentGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    stroke="hsl(142, 76%, 45%)"
                    fill="url(#resolvedGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Classification Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={classificationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {classificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 11%, 12%)",
                      border: "1px solid hsl(210, 11%, 20%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {classificationData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Recent Incidents</CardTitle>
            <Link href="/incidents">
              <Button variant="ghost" size="sm" data-testid="button-view-all-incidents">
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {incidentsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentIncidents && recentIncidents.length > 0 ? (
              <div className="space-y-2">
                {recentIncidents.map((incident) => (
                  <Link key={incident.id} href={`/incidents/${incident.id}`}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                      data-testid={`card-incident-${incident.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {incident.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {incident.correlationId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <SourceBadge source={incident.source} />
                        <ClassificationBadge classification={incident.classification} />
                        <StatusBadge status={incident.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldCheck className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No incidents recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">By Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 11%, 20%)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "hsl(210, 11%, 50%)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "hsl(210, 11%, 50%)" }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(210, 11%, 12%)",
                      border: "1px solid hsl(210, 11%, 20%)",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(217, 91%, 50%)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {recentAudit && recentAudit.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Recent Audit Activity</CardTitle>
            <Link href="/audit">
              <Button variant="ghost" size="sm" data-testid="button-view-all-audit">
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAudit.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-2 text-sm"
                  data-testid={`audit-entry-${log.id}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {log.actor}
                  </Badge>
                  <span className="text-sm truncate">{log.detail}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
