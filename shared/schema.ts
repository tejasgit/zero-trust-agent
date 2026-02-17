import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(),
  classification: text("classification").notNull().default("unclassified"),
  confidence: real("confidence").notNull().default(0),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assignmentGroup: text("assignment_group"),
  escalationAction: text("escalation_action"),
  aiReasoning: text("ai_reasoning"),
  correlationId: text("correlation_id").notNull(),
  snowId: text("snow_id"),
  pdId: text("pd_id"),
  mimId: text("mim_id"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id"),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  detail: text("detail").notNull(),
  evidencePointers: jsonb("evidence_pointers"),
  correlationId: text("correlation_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const policyRules = pgTable("policy_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  condition: text("condition").notNull(),
  action: text("action").notNull(),
  threshold: real("threshold"),
  enabled: boolean("enabled").notNull().default(true),
  category: text("category").notNull().default("escalation"),
});

export const eventSources = pgTable("event_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("active"),
  lastHeartbeat: timestamp("last_heartbeat"),
  eventsProcessed: integer("events_processed").notNull().default(0),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`'system'`),
  maturityLevel: integer("maturity_level").notNull().default(0),
  autoEscalation: boolean("auto_escalation").notNull().default(false),
  mimGating: boolean("mim_gating").notNull().default(true),
  confidenceThreshold: real("confidence_threshold").notNull().default(0.85),
  deduplicationWindow: integer("deduplication_window").notNull().default(300),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPolicyRuleSchema = createInsertSchema(policyRules).omit({ id: true });
export const insertEventSourceSchema = createInsertSchema(eventSources).omit({ id: true });
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true });

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type PolicyRule = typeof policyRules.$inferSelect;
export type InsertPolicyRule = z.infer<typeof insertPolicyRuleSchema>;
export type EventSource = typeof eventSources.$inferSelect;
export type InsertEventSource = z.infer<typeof insertEventSourceSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
