import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PulsingDot } from "@/components/status-indicator";
import { Radio, Server, Activity, Wifi, WifiOff } from "lucide-react";
import type { EventSource } from "@shared/schema";

const sourceTypeIcons: Record<string, any> = {
  webhook: Wifi,
  polling: Activity,
  streaming: Radio,
};

export default function Sources() {
  const { data: sources, isLoading } = useQuery<EventSource[]>({
    queryKey: ["/api/sources"],
  });

  const activeCount = sources?.filter((s) => s.status === "active").length || 0;
  const totalEvents = sources?.reduce((sum, s) => sum + s.eventsProcessed, 0) || 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Event Sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Connected platform integrations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <PulsingDot active={activeCount > 0} />
            <span className="text-sm text-muted-foreground">
              {activeCount} active
            </span>
          </div>
          <Badge variant="outline" className="font-mono text-xs" data-testid="badge-total-events">
            {totalEvents.toLocaleString()} events
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sources && sources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => {
            const Icon = sourceTypeIcons[source.type] || Server;
            const isActive = source.status === "active";
            return (
              <Card key={source.id} data-testid={`card-source-${source.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-md ${
                          isActive
                            ? "bg-primary/10"
                            : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{source.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {source.type}
                        </p>
                      </div>
                    </div>
                    <PulsingDot active={isActive} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Events Processed</p>
                      <p className="text-sm font-mono font-medium">
                        {source.eventsProcessed.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Last Heartbeat</p>
                      <p className="text-xs font-mono">
                        {source.lastHeartbeat
                          ? new Date(source.lastHeartbeat).toLocaleTimeString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="text-xs w-full justify-center"
                  >
                    {isActive ? "Connected" : "Disconnected"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <WifiOff className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No event sources configured</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
