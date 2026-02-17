import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  AlertTriangle,
  Shield,
  ScrollText,
  Settings,
  Radio,
  Zap,
  Gauge,
  ShieldCheck,
  VolumeX,
  Grid3X3,
  Network,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Incident, SystemSettings } from "@shared/schema";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Incidents", url: "/incidents", icon: AlertTriangle },
];

const ruleNav = [
  { title: "Escalation Rules", url: "/escalation-rules", icon: Gauge },
  { title: "Gating Rules", url: "/gating-rules", icon: ShieldCheck },
  { title: "Suppression Rules", url: "/suppression-rules", icon: VolumeX },
  { title: "Decision Matrix", url: "/decision-matrix", icon: Grid3X3 },
  { title: "Policy Engine", url: "/policies", icon: Shield },
];

const systemNav = [
  { title: "Architecture", url: "/architecture", icon: Network },
  { title: "Audit Trail", url: "/audit", icon: ScrollText },
  { title: "Event Sources", url: "/sources", icon: Radio },
  { title: "Settings", url: "/settings", icon: Settings },
];

const maturityLabels = ["Manual", "Alert-Driven", "AI-Assisted", "Autonomous"];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const openCount = incidents?.filter((i) => i.status === "open").length || 0;
  const maturityLevel = settings?.maturityLevel ?? 0;

  function renderNav(items: typeof mainNav) {
    return (
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.url === "/"
              ? location === "/"
              : location.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Link href={item.url}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                  {item.title === "Incidents" && openCount > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {openCount}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight" data-testid="text-app-title">
              Triage Agent
            </span>
            <span className="text-xs text-muted-foreground">Zero-Trust AI</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNav(mainNav)}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Rule Engine</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNav(ruleNav)}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderNav(systemNav)}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Maturity</span>
            <Badge variant="outline" className="text-xs font-mono" data-testid="badge-maturity">
              L{maturityLevel}
            </Badge>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  level <= maturityLevel
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {maturityLabels[maturityLevel]}
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
