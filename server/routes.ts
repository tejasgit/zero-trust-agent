import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertIncidentSchema, insertAuditLogSchema, insertPolicyRuleSchema,
  insertEscalationRuleSchema, insertGatingRuleSchema,
  insertSuppressionRuleSchema, insertDecisionMatrixSchema,
} from "@shared/schema";
import { z } from "zod";

const updateIncidentSchema = z.object({
  status: z.enum(["open", "triaging", "escalated", "resolved", "suppressed", "human-review"]).optional(),
  classification: z.enum(["noise", "low", "medium", "high", "sev1", "unclassified"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignmentGroup: z.string().optional(),
}).strict();

const updatePolicySchema = z.object({
  enabled: z.boolean().optional(),
}).strict();

const updateSettingsSchema = z.object({
  maturityLevel: z.number().int().min(0).max(3).optional(),
  autoEscalation: z.boolean().optional(),
  mimGating: z.boolean().optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  deduplicationWindow: z.number().int().min(60).max(900).optional(),
}).strict();

const updateEscalationRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  conditionClassification: z.string().nullable().optional(),
  conditionSource: z.string().nullable().optional(),
  conditionMinConfidence: z.number().min(0).max(1).nullable().optional(),
  conditionMaxConfidence: z.number().min(0).max(1).nullable().optional(),
  conditionPriority: z.string().nullable().optional(),
  actionType: z.string().optional(),
  actionTarget: z.string().optional(),
  actionConfig: z.any().optional(),
});

const updateGatingRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  actionType: z.string().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  requireHumanApproval: z.boolean().optional(),
  approvalTimeout: z.number().int().min(60).max(7200).optional(),
  fallbackAction: z.string().optional(),
});

const updateSuppressionRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
  sourcePattern: z.string().nullable().optional(),
  titlePattern: z.string().nullable().optional(),
  classificationPattern: z.string().nullable().optional(),
  timeWindowStart: z.string().nullable().optional(),
  timeWindowEnd: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional().transform(v => v ? new Date(v) : v),
});

const updateDecisionMatrixSchema = z.object({
  severity: z.string().optional(),
  description: z.string().optional(),
  createIncident: z.boolean().optional(),
  triggerMim: z.boolean().optional(),
  pageOncall: z.boolean().optional(),
  nrSignal: z.string().optional(),
  exampleSources: z.string().optional(),
  criteria: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/incidents", async (_req, res) => {
    const incidents = await storage.getIncidents();
    res.json(incidents);
  });

  app.get("/api/incidents/:id", async (req, res) => {
    const incident = await storage.getIncident(req.params.id);
    if (!incident) return res.status(404).json({ message: "Not found" });
    res.json(incident);
  });

  app.post("/api/incidents", async (req, res) => {
    const parsed = insertIncidentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const incident = await storage.createIncident(parsed.data);
    await storage.createAuditLog({
      incidentId: incident.id,
      action: "create",
      actor: "triage-agent",
      detail: `Incident created: ${incident.title}`,
      correlationId: incident.correlationId,
    });
    res.status(201).json(incident);
  });

  app.patch("/api/incidents/:id", async (req, res) => {
    const parsed = updateIncidentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getIncident(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateIncident(req.params.id, parsed.data);
    if (parsed.data.status && parsed.data.status !== existing.status) {
      await storage.createAuditLog({
        incidentId: req.params.id,
        action: "status-change",
        actor: "operator",
        detail: `Status changed from ${existing.status} to ${parsed.data.status}`,
        correlationId: existing.correlationId,
      });
    }
    res.json(updated);
  });

  app.get("/api/audit", async (_req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.get("/api/audit/:incidentId", async (req, res) => {
    const logs = await storage.getAuditLogsByIncident(req.params.incidentId);
    res.json(logs);
  });

  app.get("/api/policies", async (_req, res) => {
    const policies = await storage.getPolicyRules();
    res.json(policies);
  });

  app.patch("/api/policies/:id", async (req, res) => {
    const parsed = updatePolicySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getPolicyRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updatePolicyRule(req.params.id, parsed.data);
    await storage.createAuditLog({
      action: "policy-change",
      actor: "operator",
      detail: `Policy "${existing.name}" ${parsed.data.enabled !== undefined ? (parsed.data.enabled ? 'enabled' : 'disabled') : 'updated'}`,
    });
    res.json(updated);
  });

  app.get("/api/sources", async (_req, res) => {
    const sources = await storage.getEventSources();
    res.json(sources);
  });

  app.get("/api/settings", async (_req, res) => {
    let settings = await storage.getSettings();
    if (!settings) {
      settings = await storage.updateSettings({
        maturityLevel: 0,
        autoEscalation: false,
        mimGating: true,
        confidenceThreshold: 0.85,
        deduplicationWindow: 300,
      });
    }
    res.json(settings);
  });

  app.patch("/api/settings", async (req, res) => {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateSettings(parsed.data);
    if (parsed.data.maturityLevel !== undefined) {
      await storage.createAuditLog({
        action: "policy-change",
        actor: "operator",
        detail: `Maturity level changed to Level ${parsed.data.maturityLevel}`,
      });
    }
    res.json(updated);
  });

  app.get("/api/escalation-rules", async (_req, res) => {
    const rules = await storage.getEscalationRules();
    res.json(rules);
  });

  app.get("/api/escalation-rules/:id", async (req, res) => {
    const rule = await storage.getEscalationRule(req.params.id);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.post("/api/escalation-rules", async (req, res) => {
    const parsed = insertEscalationRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const rule = await storage.createEscalationRule(parsed.data);
    await storage.createAuditLog({
      action: "rule-create",
      actor: "operator",
      detail: `Escalation rule created: "${rule.name}"`,
    });
    res.status(201).json(rule);
  });

  app.patch("/api/escalation-rules/:id", async (req, res) => {
    const parsed = updateEscalationRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getEscalationRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateEscalationRule(req.params.id, parsed.data);
    await storage.createAuditLog({
      action: "rule-update",
      actor: "operator",
      detail: `Escalation rule updated: "${existing.name}"${parsed.data.enabled !== undefined ? ` (${parsed.data.enabled ? 'enabled' : 'disabled'})` : ''}`,
    });
    res.json(updated);
  });

  app.delete("/api/escalation-rules/:id", async (req, res) => {
    const existing = await storage.getEscalationRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deleteEscalationRule(req.params.id);
    await storage.createAuditLog({
      action: "rule-delete",
      actor: "operator",
      detail: `Escalation rule deleted: "${existing.name}"`,
    });
    res.status(204).send();
  });

  app.get("/api/gating-rules", async (_req, res) => {
    const rules = await storage.getGatingRules();
    res.json(rules);
  });

  app.get("/api/gating-rules/:id", async (req, res) => {
    const rule = await storage.getGatingRule(req.params.id);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.post("/api/gating-rules", async (req, res) => {
    const parsed = insertGatingRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const rule = await storage.createGatingRule(parsed.data);
    await storage.createAuditLog({
      action: "rule-create",
      actor: "operator",
      detail: `Gating rule created: "${rule.name}"`,
    });
    res.status(201).json(rule);
  });

  app.patch("/api/gating-rules/:id", async (req, res) => {
    const parsed = updateGatingRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getGatingRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateGatingRule(req.params.id, parsed.data);
    await storage.createAuditLog({
      action: "rule-update",
      actor: "operator",
      detail: `Gating rule updated: "${existing.name}"${parsed.data.enabled !== undefined ? ` (${parsed.data.enabled ? 'enabled' : 'disabled'})` : ''}`,
    });
    res.json(updated);
  });

  app.delete("/api/gating-rules/:id", async (req, res) => {
    const existing = await storage.getGatingRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deleteGatingRule(req.params.id);
    await storage.createAuditLog({
      action: "rule-delete",
      actor: "operator",
      detail: `Gating rule deleted: "${existing.name}"`,
    });
    res.status(204).send();
  });

  app.get("/api/suppression-rules", async (_req, res) => {
    const rules = await storage.getSuppressionRules();
    res.json(rules);
  });

  app.get("/api/suppression-rules/:id", async (req, res) => {
    const rule = await storage.getSuppressionRule(req.params.id);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.post("/api/suppression-rules", async (req, res) => {
    const parsed = insertSuppressionRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const rule = await storage.createSuppressionRule(parsed.data);
    await storage.createAuditLog({
      action: "rule-create",
      actor: "operator",
      detail: `Suppression rule created: "${rule.name}"`,
    });
    res.status(201).json(rule);
  });

  app.patch("/api/suppression-rules/:id", async (req, res) => {
    const parsed = updateSuppressionRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getSuppressionRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateSuppressionRule(req.params.id, parsed.data);
    await storage.createAuditLog({
      action: "rule-update",
      actor: "operator",
      detail: `Suppression rule updated: "${existing.name}"${parsed.data.enabled !== undefined ? ` (${parsed.data.enabled ? 'enabled' : 'disabled'})` : ''}`,
    });
    res.json(updated);
  });

  app.delete("/api/suppression-rules/:id", async (req, res) => {
    const existing = await storage.getSuppressionRule(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deleteSuppressionRule(req.params.id);
    await storage.createAuditLog({
      action: "rule-delete",
      actor: "operator",
      detail: `Suppression rule deleted: "${existing.name}"`,
    });
    res.status(204).send();
  });

  app.get("/api/decision-matrix", async (_req, res) => {
    const entries = await storage.getDecisionMatrix();
    res.json(entries);
  });

  app.get("/api/decision-matrix/:id", async (req, res) => {
    const entry = await storage.getDecisionMatrixEntry(req.params.id);
    if (!entry) return res.status(404).json({ message: "Not found" });
    res.json(entry);
  });

  app.post("/api/decision-matrix", async (req, res) => {
    const parsed = insertDecisionMatrixSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const entry = await storage.createDecisionMatrixEntry(parsed.data);
    await storage.createAuditLog({
      action: "matrix-create",
      actor: "operator",
      detail: `Decision matrix entry created: "${entry.severity}"`,
    });
    res.status(201).json(entry);
  });

  app.patch("/api/decision-matrix/:id", async (req, res) => {
    const parsed = updateDecisionMatrixSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const existing = await storage.getDecisionMatrixEntry(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateDecisionMatrixEntry(req.params.id, parsed.data);
    await storage.createAuditLog({
      action: "matrix-update",
      actor: "operator",
      detail: `Decision matrix entry updated: "${existing.severity}"`,
    });
    res.json(updated);
  });

  app.delete("/api/decision-matrix/:id", async (req, res) => {
    const existing = await storage.getDecisionMatrixEntry(req.params.id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deleteDecisionMatrixEntry(req.params.id);
    await storage.createAuditLog({
      action: "matrix-delete",
      actor: "operator",
      detail: `Decision matrix entry deleted: "${existing.severity}"`,
    });
    res.status(204).send();
  });

  return httpServer;
}
