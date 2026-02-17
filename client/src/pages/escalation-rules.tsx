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
import { Gauge, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EscalationRule } from "@shared/schema";

const actionTypes = [
  { value: "pagerduty-escalate", label: "PagerDuty Escalate" },
  { value: "servicenow-create", label: "ServiceNow Create INC" },
  { value: "mim-trigger", label: "Trigger MIM Bridge" },
  { value: "slack-notify", label: "Slack Notification" },
  { value: "human-review", label: "Human Review Queue" },
];

const classifications = [
  { value: "sev1", label: "SEV-1 (Critical)" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "noise", label: "Noise" },
];

const sources = [
  { value: "cloudwatch", label: "CloudWatch" },
  { value: "newrelic", label: "New Relic" },
  { value: "salesforce", label: "Salesforce" },
  { value: "splunk", label: "Splunk" },
  { value: "snaplogic", label: "SnapLogic" },
  { value: "aem", label: "AEM" },
];

const defaultForm = {
  name: "",
  description: "",
  priority: 100,
  enabled: true,
  conditionClassification: "",
  conditionSource: "",
  conditionMinConfidence: "",
  conditionMaxConfidence: "",
  conditionPriority: "",
  actionType: "pagerduty-escalate",
  actionTarget: "",
};

export default function EscalationRules() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<EscalationRule | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: rules, isLoading } = useQuery<EscalationRule[]>({
    queryKey: ["/api/escalation-rules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/escalation-rules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalation-rules"] });
      toast({ title: "Escalation rule created" });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/escalation-rules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalation-rules"] });
      toast({ title: "Escalation rule updated" });
      closeDialog();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/escalation-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalation-rules"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/escalation-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escalation-rules"] });
      toast({ title: "Escalation rule deleted" });
      setDeleteDialogOpen(false);
      setDeletingRule(null);
    },
  });

  function openCreate() {
    setEditingRule(null);
    setForm(defaultForm);
    setDialogOpen(true);
  }

  function openEdit(rule: EscalationRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description,
      priority: rule.priority,
      enabled: rule.enabled,
      conditionClassification: rule.conditionClassification || "",
      conditionSource: rule.conditionSource || "",
      conditionMinConfidence: rule.conditionMinConfidence?.toString() || "",
      conditionMaxConfidence: rule.conditionMaxConfidence?.toString() || "",
      conditionPriority: rule.conditionPriority || "",
      actionType: rule.actionType,
      actionTarget: rule.actionTarget,
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
      priority: Number(form.priority),
      enabled: form.enabled,
      conditionClassification: form.conditionClassification || null,
      conditionSource: form.conditionSource || null,
      conditionMinConfidence: form.conditionMinConfidence ? parseFloat(form.conditionMinConfidence) : null,
      conditionMaxConfidence: form.conditionMaxConfidence ? parseFloat(form.conditionMaxConfidence) : null,
      conditionPriority: form.conditionPriority || null,
      actionType: form.actionType,
      actionTarget: form.actionTarget,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const actionLabel = (type: string) => actionTypes.find(a => a.value === type)?.label || type;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Escalation Rules
          </h1>
          <p className="text-sm text-muted-foreground">
            Define conditions that trigger automated escalation actions
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-escalation">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Rule
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
            <Card key={rule.id} data-testid={`card-escalation-${rule.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded text-muted-foreground mt-0.5">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-medium" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
                      <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-priority-${rule.id}`}>
                        P{rule.priority}
                      </Badge>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-action-type-${rule.id}`}>
                        {actionLabel(rule.actionType)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2" data-testid={`text-description-${rule.id}`}>{rule.description}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {rule.conditionClassification && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Class:</span>
                          <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-classification-${rule.id}`}>{rule.conditionClassification}</code>
                        </div>
                      )}
                      {rule.conditionSource && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Source:</span>
                          <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-source-${rule.id}`}>{rule.conditionSource}</code>
                        </div>
                      )}
                      {rule.conditionMinConfidence !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-confidence-${rule.id}`}>
                            {Math.round(rule.conditionMinConfidence * 100)}%
                            {rule.conditionMaxConfidence !== null ? ` - ${Math.round(rule.conditionMaxConfidence * 100)}%` : "+"}
                          </code>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Target:</span>
                        <code className="text-xs font-mono bg-accent/50 px-1.5 py-0.5 rounded" data-testid={`code-target-${rule.id}`}>{rule.actionTarget}</code>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(rule)} data-testid={`button-edit-escalation-${rule.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setDeletingRule(rule); setDeleteDialogOpen(true); }} data-testid={`button-delete-escalation-${rule.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, enabled: checked })}
                      data-testid={`switch-escalation-${rule.id}`}
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
            <Gauge className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No escalation rules configured</p>
            <Button onClick={openCreate} variant="outline" data-testid="button-create-escalation-empty">
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Create"} Escalation Rule</DialogTitle>
            <DialogDescription>
              {editingRule ? "Modify the rule conditions and actions" : "Define conditions that trigger an escalation action"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="P1 Auto-Page" data-testid="input-escalation-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe when this rule fires..." data-testid="input-escalation-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority Order</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({...form, priority: parseInt(e.target.value) || 100})} data-testid="input-escalation-priority" />
              </div>
              <div className="space-y-1.5">
                <Label>Classification</Label>
                <Select value={form.conditionClassification} onValueChange={(v) => setForm({...form, conditionClassification: v})}>
                  <SelectTrigger data-testid="select-escalation-classification"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {classifications.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.conditionSource} onValueChange={(v) => setForm({...form, conditionSource: v})}>
                  <SelectTrigger data-testid="select-escalation-source"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {sources.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min Confidence</Label>
                <Input type="number" step="0.05" min="0" max="1" value={form.conditionMinConfidence} onChange={(e) => setForm({...form, conditionMinConfidence: e.target.value})} placeholder="0.85" data-testid="input-escalation-min-confidence" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Action Type</Label>
                <Select value={form.actionType} onValueChange={(v) => setForm({...form, actionType: v})}>
                  <SelectTrigger data-testid="select-escalation-action"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Action Target</Label>
                <Input value={form.actionTarget} onChange={(e) => setForm({...form, actionTarget: e.target.value})} placeholder="oncall-team" data-testid="input-escalation-target" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-escalation">Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.actionTarget || createMutation.isPending || updateMutation.isPending} data-testid="button-submit-escalation">
              {editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Escalation Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRule?.name}"? This action cannot be undone and will be logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingRule && deleteMutation.mutate(deletingRule.id)} data-testid="button-confirm-delete-escalation">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
