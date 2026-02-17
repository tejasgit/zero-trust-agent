import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertIncidentSchema, insertAuditLogSchema, insertPolicyRuleSchema } from "@shared/schema";
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

  return httpServer;
}
