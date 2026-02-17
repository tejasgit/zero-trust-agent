import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VolumeX, Plus, Pencil, Trash2, Clock, Filter } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SuppressionRule } from "@shared/schema";

const defaultForm = {
  name: "",
  description: "",
  enabled: true,
  sourcePattern: "",
  titlePattern: "",
  classificationPattern: "",
  timeWindowStart: "",
  timeWindowEnd: "",
  expiresAt: "",
};

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export default function SuppressionRules() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SuppressionRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<SuppressionRule | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: rules, isLoading } = useQuery<SuppressionRule[]>({
    queryKey: ["/api/suppression-rules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/suppression-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppression-rules"] });
      toast({ title: "Suppression rule created" });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/suppression-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppression-rules"] });
      toast({ title: "Suppression rule updated" });
      closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/suppression-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppression-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/suppression-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppression-rules"] });
      toast({ title: "Suppression rule deleted" });
      setDeleteDialogOpen(false);
      setDeletingRule(null);
    },
  });

  function openCreate() {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(rule: SuppressionRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      sourcePattern: rule.sourcePattern || "",
      titlePattern: rule.titlePattern || "",
      classificationPattern: rule.classificationPattern || "",
      timeWindowStart: rule.timeWindowStart || "",
      timeWindowEnd: rule.timeWindowEnd || "",
      expiresAt: rule.expiresAt ? new Date(rule.expiresAt).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRule(null);
    setForm(defaultForm);
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      description: form.description,
      enabled: form.enabled,
      sourcePattern: form.sourcePattern || null,
      titlePattern: form.titlePattern || null,
      classificationPattern: form.classificationPattern || null,
      timeWindowStart: form.timeWindowStart || null,
      timeWindowEnd: form.timeWindowEnd || null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const activeRules = rules?.filter(r => r.enabled && !isExpired(r.expiresAt)) || [];
  const inactiveRules = rules?.filter(r => !r.enabled || isExpired(r.expiresAt)) || [];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Suppression Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter out known noise and maintenance windows to reduce alert fatigue
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-suppression">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Suppression
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <>
          {activeRules.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Active Suppressions</h2>
                <Badge variant="outline" className="text-xs">{activeRules.length}</Badge>
              </div>
              {activeRules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={(r) => { setDeletingRule(r); setDeleteDialogOpen(true); }} onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })} />
              ))}
            </div>
          )}
          {inactiveRules.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-medium">Inactive / Expired</h2>
                <Badge variant="outline" className="text-xs">{inactiveRules.length}</Badge>
              </div>
              {inactiveRules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={(r) => { setDeletingRule(r); setDeleteDialogOpen(true); }} onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })} />
              ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <VolumeX className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No suppression rules configured</p>
            <Button onClick={openCreate} variant="outline" data-testid="button-create-suppression-empty">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Suppression
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Create"} Suppression Rule</DialogTitle>
            <DialogDescription>
              {editingRule ? "Modify the suppression filters" : "Define patterns to suppress matching events"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Maintenance Window - US-East" data-testid="input-suppression-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe what this suppression covers..." data-testid="input-suppression-description" />
            </div>
            <div className="space-y-1.5">
              <Label>Source Pattern (regex)</Label>
              <Input value={form.sourcePattern} onChange={(e) => setForm({...form, sourcePattern: e.target.value})} placeholder="cloudwatch|newrelic" data-testid="input-suppression-source" />
            </div>
            <div className="space-y-1.5">
              <Label>Title Pattern (regex)</Label>
              <Input value={form.titlePattern} onChange={(e) => setForm({...form, titlePattern: e.target.value})} placeholder=".*maintenance.*" data-testid="input-suppression-title" />
            </div>
            <div className="space-y-1.5">
              <Label>Classification Pattern</Label>
              <Input value={form.classificationPattern} onChange={(e) => setForm({...form, classificationPattern: e.target.value})} placeholder="noise|low" data-testid="input-suppression-classification" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Time Window Start</Label>
                <Input value={form.timeWindowStart} onChange={(e) => setForm({...form, timeWindowStart: e.target.value})} placeholder="02:00" data-testid="input-suppression-window-start" />
              </div>
              <div className="space-y-1.5">
                <Label>Time Window End</Label>
                <Input value={form.timeWindowEnd} onChange={(e) => setForm({...form, timeWindowEnd: e.target.value})} placeholder="06:00" data-testid="input-suppression-window-end" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expires At</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt: e.target.value})} data-testid="input-suppression-expires" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-suppression">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending} data-testid="button-submit-suppression">
              {editingRule ? "Save Changes" : "Create Suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suppression Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingRule && deleteMutation.mutate(deletingRule.id)} data-testid="button-confirm-delete-suppression">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RuleCard({ rule, onEdit, onDelete, onToggle }: {
  rule: SuppressionRule;
  onEdit: (rule: SuppressionRule) => void;
  onDelete: (rule: SuppressionRule) => void;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  const expired = isExpired(rule.expiresAt);

  return (
    <Card data-testid={`card-suppression-${rule.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-sm font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
              {expired && <Badge variant="outline" className="text-xs text-destructive" data-testid={`badge-expired-${rule.id}`}>Expired</Badge>}
              {rule.suppressedCount > 0 && (
                <Badge variant="secondary" className="text-xs" data-testid={`badge-suppressed-count-${rule.id}`}>
                  {rule.suppressedCount} suppressed
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2" data-testid={`text-description-${rule.id}`}>{rule.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {rule.sourcePattern && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Source:</span>
                  <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-source-${rule.id}`}>{rule.sourcePattern}</code>
                </div>
              )}
              {rule.titlePattern && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Title:</span>
                  <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-title-${rule.id}`}>{rule.titlePattern}</code>
                </div>
              )}
              {rule.timeWindowStart && rule.timeWindowEnd && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-time-window-${rule.id}`}>
                    {rule.timeWindowStart} - {rule.timeWindowEnd}
                  </code>
                </div>
              )}
              {rule.expiresAt && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Expires:</span>
                  <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-expires-${rule.id}`}>
                    {new Date(rule.expiresAt).toLocaleDateString()}
                  </code>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => onEdit(rule)} data-testid={`button-edit-suppression-${rule.id}`}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(rule)} data-testid={`button-delete-suppression-${rule.id}`}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Switch
              checked={rule.enabled}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
              data-testid={`switch-suppression-${rule.id}`}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
