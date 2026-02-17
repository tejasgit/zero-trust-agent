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

export const escalationRules = pgTable("escalation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priority: integer("priority").notNull().default(100),
  enabled: boolean("enabled").notNull().default(true),
  conditionClassification: text("condition_classification"),
  conditionSource: text("condition_source"),
  conditionMinConfidence: real("condition_min_confidence"),
  conditionMaxConfidence: real("condition_max_confidence"),
  conditionPriority: text("condition_priority"),
  actionType: text("action_type").notNull(),
  actionTarget: text("action_target").notNull(),
  actionConfig: jsonb("action_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gatingRules = pgTable("gating_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  actionType: text("action_type").notNull(),
  minConfidence: real("min_confidence").notNull().default(0.85),
  requireHumanApproval: boolean("require_human_approval").notNull().default(false),
  approvalTimeout: integer("approval_timeout").notNull().default(900),
  fallbackAction: text("fallback_action").notNull().default("queue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const suppressionRules = pgTable("suppression_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  sourcePattern: text("source_pattern"),
  titlePattern: text("title_pattern"),
  classificationPattern: text("classification_pattern"),
  timeWindowStart: text("time_window_start"),
  timeWindowEnd: text("time_window_end"),
  expiresAt: timestamp("expires_at"),
  suppressedCount: integer("suppressed_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const decisionMatrix = pgTable("decision_matrix", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  createIncident: boolean("create_incident").notNull().default(true),
  triggerMim: boolean("trigger_mim").notNull().default(false),
  pageOncall: boolean("page_oncall").notNull().default(false),
  nrSignal: text("nr_signal").notNull().default(""),
  exampleSources: text("example_sources").notNull().default(""),
  criteria: text("criteria").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertPolicyRuleSchema = createInsertSchema(policyRules).omit({ id: true });
export const insertEventSourceSchema = createInsertSchema(eventSources).omit({ id: true });
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true });

export const insertEscalationRuleSchema = createInsertSchema(escalationRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGatingRuleSchema = createInsertSchema(gatingRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSuppressionRuleSchema = createInsertSchema(suppressionRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDecisionMatrixSchema = createInsertSchema(decisionMatrix).omit({ id: true, createdAt: true, updatedAt: true });

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

export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;
export type GatingRule = typeof gatingRules.$inferSelect;
export type InsertGatingRule = z.infer<typeof insertGatingRuleSchema>;
export type SuppressionRule = typeof suppressionRules.$inferSelect;
export type InsertSuppressionRule = z.infer<typeof insertSuppressionRuleSchema>;
export type DecisionMatrixEntry = typeof decisionMatrix.$inferSelect;
export type InsertDecisionMatrixEntry = z.infer<typeof insertDecisionMatrixSchema>;

export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
