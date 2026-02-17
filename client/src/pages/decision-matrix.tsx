import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Grid3X3, Plus, Trash2, Check, X, Save } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DecisionMatrixEntry } from "@shared/schema";

const severityColors: Record<string, string> = {
  P1: "bg-destructive/15 text-destructive",
  P2: "bg-chart-4/15 text-chart-4",
  P3: "bg-chart-2/15 text-chart-2",
  P4: "bg-muted text-muted-foreground",
};

const defaultForm = {
  severity: "",
  description: "",
  createIncident: true,
  triggerMim: false,
  pageOncall: false,
  nrSignal: "",
  exampleSources: "",
  criteria: "",
  sortOrder: 0,
};

export default function DecisionMatrix() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<DecisionMatrixEntry | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [editingCells, setEditingCells] = useState<Record<string, Partial<DecisionMatrixEntry>>>({});

  const { data: entries, isLoading } = useQuery<DecisionMatrixEntry[]>({
    queryKey: ["/api/decision-matrix"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/decision-matrix", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decision-matrix"] });
      toast({ title: "Matrix entry created" });
      closeDialog();
    },
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/decision-matrix/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decision-matrix"] });
      setEditingCells((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({ title: "Matrix entry updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/decision-matrix/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/decision-matrix"] });
      toast({ title: "Matrix entry deleted" });
      setDeleteDialogOpen(false);
      setDeletingEntry(null);
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setForm(defaultForm);
  }

  function handleCreate() {
    createMutation.mutate(form);
  }

  function startInlineEdit(entry: DecisionMatrixEntry) {
    setEditingCells((prev) => ({
      ...prev,
      [entry.id]: {
        severity: entry.severity,
        description: entry.description,
        criteria: entry.criteria,
        createIncident: entry.createIncident,
        triggerMim: entry.triggerMim,
        pageOncall: entry.pageOncall,
        nrSignal: entry.nrSignal,
        exampleSources: entry.exampleSources,
      },
    }));
  }

  function updateInlineField(id: string, field: string, value: any) {
    setEditingCells((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function saveInlineEdit(id: string) {
    const changes = editingCells[id];
    if (changes) {
      inlineUpdateMutation.mutate({ id, data: changes });
    }
  }

  function cancelInlineEdit(id: string) {
    setEditingCells((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleToggle(entry: DecisionMatrixEntry, field: "createIncident" | "triggerMim" | "pageOncall", value: boolean) {
    inlineUpdateMutation.mutate({ id: entry.id, data: { [field]: value } });
  }

  const isEditing = (id: string) => id in editingCells;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
            Decision Matrix
          </h1>
          <p className="text-sm text-muted-foreground">
            Triage severity definitions and automated response mapping. Click any row to edit inline.
          </p>
        </div>
        <Button onClick={() => { setForm({...defaultForm, sortOrder: (entries?.length || 0)}); setDialogOpen(true); }} data-testid="button-create-matrix">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Severity Level
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
      ) : entries && entries.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Severity</TableHead>
                    <TableHead className="min-w-[200px]">Description / Criteria</TableHead>
                    <TableHead className="text-center w-16">INC</TableHead>
                    <TableHead className="text-center w-16">MIM</TableHead>
                    <TableHead className="text-center w-16">Page</TableHead>
                    <TableHead className="min-w-[120px]">NR Signal</TableHead>
                    <TableHead className="min-w-[140px]">Example Sources</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const editing = isEditing(entry.id);
                    const draft = editingCells[entry.id];

                    return (
                      <TableRow
                        key={entry.id}
                        data-testid={`row-matrix-${entry.id}`}
                        className={editing ? "bg-accent/30" : "cursor-pointer hover-elevate"}
                        onClick={() => !editing && startInlineEdit(entry)}
                      >
                        <TableCell>
                          {editing ? (
                            <Input
                              value={draft?.severity as string || ""}
                              onChange={(e) => updateInlineField(entry.id, "severity", e.target.value)}
                              className="h-8 text-xs w-16"
                              data-testid={`inline-severity-${entry.id}`}
                            />
                          ) : (
                            <Badge className={`text-xs ${severityColors[entry.severity] || ""}`} data-testid={`badge-severity-${entry.id}`}>
                              {entry.severity}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => editing && e.stopPropagation()}>
                          {editing ? (
                            <div className="space-y-1">
                              <Input
                                value={draft?.description as string || ""}
                                onChange={(e) => updateInlineField(entry.id, "description", e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Description"
                                data-testid={`inline-description-${entry.id}`}
                              />
                              <Input
                                value={draft?.criteria as string || ""}
                                onChange={(e) => updateInlineField(entry.id, "criteria", e.target.value)}
                                className="h-8 text-xs"
                                placeholder="Criteria"
                                data-testid={`inline-criteria-${entry.id}`}
                              />
                            </div>
                          ) : (
                            <div className="max-w-xs">
                              <p className="text-sm font-medium" data-testid={`text-description-${entry.id}`}>{entry.description}</p>
                              {entry.criteria && (
                                <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-criteria-${entry.id}`}>{entry.criteria}</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {editing ? (
                            <Switch
                              checked={draft?.createIncident as boolean}
                              onCheckedChange={(v) => updateInlineField(entry.id, "createIncident", v)}
                              data-testid={`inline-incident-${entry.id}`}
                            />
                          ) : (
                            <div
                              className="cursor-pointer inline-flex"
                              onClick={(e) => { e.stopPropagation(); handleToggle(entry, "createIncident", !entry.createIncident); }}
                              data-testid={`toggle-incident-${entry.id}`}
                            >
                              {entry.createIncident ? (
                                <Check className="w-4 h-4 text-chart-2 mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground mx-auto" />
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {editing ? (
                            <Switch
                              checked={draft?.triggerMim as boolean}
                              onCheckedChange={(v) => updateInlineField(entry.id, "triggerMim", v)}
                              data-testid={`inline-mim-${entry.id}`}
                            />
                          ) : (
                            <div
                              className="cursor-pointer inline-flex"
                              onClick={(e) => { e.stopPropagation(); handleToggle(entry, "triggerMim", !entry.triggerMim); }}
                              data-testid={`toggle-mim-${entry.id}`}
                            >
                              {entry.triggerMim ? (
                                <Check className="w-4 h-4 text-destructive mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground mx-auto" />
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {editing ? (
                            <Switch
                              checked={draft?.pageOncall as boolean}
                              onCheckedChange={(v) => updateInlineField(entry.id, "pageOncall", v)}
                              data-testid={`inline-page-${entry.id}`}
                            />
                          ) : (
                            <div
                              className="cursor-pointer inline-flex"
                              onClick={(e) => { e.stopPropagation(); handleToggle(entry, "pageOncall", !entry.pageOncall); }}
                              data-testid={`toggle-page-${entry.id}`}
                            >
                              {entry.pageOncall ? (
                                <Check className="w-4 h-4 text-chart-4 mx-auto" />
                              ) : (
                                <X className="w-4 h-4 text-muted-foreground mx-auto" />
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => editing && e.stopPropagation()}>
                          {editing ? (
                            <Input
                              value={draft?.nrSignal as string || ""}
                              onChange={(e) => updateInlineField(entry.id, "nrSignal", e.target.value)}
                              className="h-8 text-xs"
                              placeholder="CRITICAL"
                              data-testid={`inline-nr-signal-${entry.id}`}
                            />
                          ) : (
                            <code className="text-xs font-mono" data-testid={`text-nr-signal-${entry.id}`}>{entry.nrSignal || "-"}</code>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => editing && e.stopPropagation()}>
                          {editing ? (
                            <Input
                              value={draft?.exampleSources as string || ""}
                              onChange={(e) => updateInlineField(entry.id, "exampleSources", e.target.value)}
                              className="h-8 text-xs"
                              placeholder="CloudWatch, PD"
                              data-testid={`inline-sources-${entry.id}`}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground" data-testid={`text-sources-${entry.id}`}>{entry.exampleSources || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {editing ? (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => saveInlineEdit(entry.id)} data-testid={`button-save-matrix-${entry.id}`}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => cancelInlineEdit(entry.id)} data-testid={`button-cancel-matrix-${entry.id}`}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeletingEntry(entry); setDeleteDialogOpen(true); }} data-testid={`button-delete-matrix-${entry.id}`}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No decision matrix entries configured</p>
            <Button onClick={() => { setForm({...defaultForm, sortOrder: 0}); setDialogOpen(true); }} variant="outline" data-testid="button-create-matrix-empty">
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Severity Level
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Severity Level</DialogTitle>
            <DialogDescription>
              Define a new severity level and its automated response. You can edit values inline after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Input value={form.severity} onChange={(e) => setForm({...form, severity: e.target.value})} placeholder="P1" data-testid="input-matrix-severity" />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({...form, sortOrder: parseInt(e.target.value) || 0})} data-testid="input-matrix-order" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Critical production outage" data-testid="input-matrix-description" />
            </div>
            <div className="space-y-1.5">
              <Label>Criteria</Label>
              <Textarea value={form.criteria} onChange={(e) => setForm({...form, criteria: e.target.value})} placeholder="Revenue impact > $10K, user-facing, multi-region..." data-testid="input-matrix-criteria" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={form.createIncident} onCheckedChange={(checked) => setForm({...form, createIncident: checked})} data-testid="switch-matrix-incident" />
                <Label>Create ServiceNow Incident</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.triggerMim} onCheckedChange={(checked) => setForm({...form, triggerMim: checked})} data-testid="switch-matrix-mim" />
                <Label>Trigger MIM Bridge</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.pageOncall} onCheckedChange={(checked) => setForm({...form, pageOncall: checked})} data-testid="switch-matrix-page" />
                <Label>Page On-Call Engineer</Label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Relic Signal</Label>
              <Input value={form.nrSignal} onChange={(e) => setForm({...form, nrSignal: e.target.value})} placeholder="CRITICAL, HIGH, MEDIUM..." data-testid="input-matrix-nr-signal" />
            </div>
            <div className="space-y-1.5">
              <Label>Example Sources</Label>
              <Input value={form.exampleSources} onChange={(e) => setForm({...form, exampleSources: e.target.value})} placeholder="CloudWatch, PagerDuty, Salesforce" data-testid="input-matrix-sources" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-create-matrix">Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.severity || !form.description || createMutation.isPending} data-testid="button-submit-matrix">
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Matrix Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deletingEntry?.severity}" severity level? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-matrix">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingEntry && deleteMutation.mutate(deletingEntry.id)} data-testid="button-confirm-delete-matrix">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
