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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Plus, Pencil, Trash2, UserCheck, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GatingRule } from "@shared/schema";

const actionTypes = [
  { value: "pagerduty-escalate", label: "PagerDuty Escalate" },
  { value: "servicenow-create", label: "ServiceNow Create INC" },
  { value: "mim-trigger", label: "Trigger MIM Bridge" },
  { value: "slack-notify", label: "Slack Notification" },
  { value: "auto-resolve", label: "Auto-Resolve" },
];

const fallbackActions = [
  { value: "queue", label: "Queue for Later" },
  { value: "human-review", label: "Send to Human Review" },
  { value: "skip", label: "Skip Action" },
  { value: "escalate", label: "Escalate to Manager" },
];

const defaultForm = {
  name: "",
  description: "",
  enabled: true,
  actionType: "pagerduty-escalate",
  minConfidence: "0.85",
  requireHumanApproval: false,
  approvalTimeout: 900,
  fallbackAction: "queue",
};

export default function GatingRules() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GatingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<GatingRule | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: rules, isLoading } = useQuery<GatingRule[]>({
    queryKey: ["/api/gating-rules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/gating-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gating-rules"] });
      toast({ title: "Gating rule created" });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/gating-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gating-rules"] });
      toast({ title: "Gating rule updated" });
      closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/gating-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gating-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/gating-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gating-rules"] });
      toast({ title: "Gating rule deleted" });
      setDeleteDialogOpen(false);
      setDeletingRule(null);
    },
  });

  function openCreate() {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(rule: GatingRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      enabled: rule.enabled,
      actionType: rule.actionType,
      minConfidence: rule.minConfidence.toString(),
      requireHumanApproval: rule.requireHumanApproval,
      approvalTimeout: rule.approvalTimeout,
      fallbackAction: rule.fallbackAction,
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
      actionType: form.actionType,
      minConfidence: parseFloat(form.minConfidence),
      requireHumanApproval: form.requireHumanApproval,
      approvalTimeout: form.approvalTimeout,
      fallbackAction: form.fallbackAction,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const actionLabel = (type: string) => actionTypes.find(a => a.value === type)?.label || type;
  const fallbackLabel = (type: string) => fallbackActions.find(a => a.value === type)?.label || type;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Gating Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Control which actions require minimum confidence or human approval
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-gating">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Gate
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id} data-testid={`card-gating-${rule.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-action-type-${rule.id}`}>
                        {actionLabel(rule.actionType)}
                      </Badge>
                      {rule.requireHumanApproval && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-human-approval-${rule.id}`}>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Human Approval
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2" data-testid={`text-description-${rule.id}`}>{rule.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Min Confidence:</span>
                        <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-confidence-${rule.id}`}>
                          {Math.round(rule.minConfidence * 100)}%
                        </code>
                      </div>
                      {rule.requireHumanApproval && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Timeout:</span>
                          <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-timeout-${rule.id}`}>
                            {Math.round(rule.approvalTimeout / 60)}m
                          </code>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Fallback:</span>
                        <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-fallback-${rule.id}`}>
                          {fallbackLabel(rule.fallbackAction)}
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(rule)} data-testid={`button-edit-gating-${rule.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setDeletingRule(rule); setDeleteDialogOpen(true); }} data-testid={`button-delete-gating-${rule.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, enabled: checked })}
                      data-testid={`switch-gating-${rule.id}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShieldCheck className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No gating rules configured</p>
            <Button onClick={openCreate} variant="outline" data-testid="button-create-gating-empty">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Gate
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Create"} Gating Rule</DialogTitle>
            <DialogDescription>
              {editingRule ? "Modify the gate conditions" : "Set confidence thresholds and approval requirements for actions"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="MIM Trigger Gate" data-testid="input-gating-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe the gating criteria..." data-testid="input-gating-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Action Type</Label>
                <Select value={form.actionType} onValueChange={(v) => setForm({...form, actionType: v})}>
                  <SelectTrigger data-testid="select-gating-action"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min Confidence</Label>
                <Input type="number" step="0.05" min="0" max="1" value={form.minConfidence} onChange={(e) => setForm({...form, minConfidence: e.target.value})} data-testid="input-gating-confidence" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.requireHumanApproval}
                onCheckedChange={(checked) => setForm({...form, requireHumanApproval: checked})}
                data-testid="switch-gating-human-approval"
              />
              <Label>Require Human Approval</Label>
            </div>
            {form.requireHumanApproval && (
              <div className="space-y-1.5">
                <Label>Approval Timeout (seconds)</Label>
                <Input type="number" min={60} max={7200} value={form.approvalTimeout} onChange={(e) => setForm({...form, approvalTimeout: parseInt(e.target.value) || 900})} data-testid="input-gating-timeout" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Fallback Action</Label>
              <Select value={form.fallbackAction} onValueChange={(v) => setForm({...form, fallbackAction: v})}>
                <SelectTrigger data-testid="select-gating-fallback"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fallbackActions.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-gating">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || createMutation.isPending || updateMutation.isPending} data-testid="button-submit-gating">
              {editingRule ? "Save Changes" : "Create Gate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gating Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRule?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingRule && deleteMutation.mutate(deletingRule.id)} data-testid="button-confirm-delete-gating">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
