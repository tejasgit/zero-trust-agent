import {
  type Incident, type InsertIncident,
  type AuditLog, type InsertAuditLog,
  type PolicyRule, type InsertPolicyRule,
  type EventSource, type InsertEventSource,
  type SystemSettings, type InsertSystemSettings,
  type EscalationRule, type InsertEscalationRule,
  type GatingRule, type InsertGatingRule,
  type SuppressionRule, type InsertSuppressionRule,
  type DecisionMatrixEntry, type InsertDecisionMatrixEntry,
  incidents, auditLogs, policyRules, eventSources, systemSettings,
  escalationRules, gatingRules, suppressionRules, decisionMatrix,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  getIncidents(): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | undefined>;

  getAuditLogs(): Promise<AuditLog[]>;
  getAuditLogsByIncident(incidentId: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  getPolicyRules(): Promise<PolicyRule[]>;
  getPolicyRule(id: string): Promise<PolicyRule | undefined>;
  createPolicyRule(rule: InsertPolicyRule): Promise<PolicyRule>;
  updatePolicyRule(id: string, updates: Partial<PolicyRule>): Promise<PolicyRule | undefined>;

  getEventSources(): Promise<EventSource[]>;
  createEventSource(source: InsertEventSource): Promise<EventSource>;

  getSettings(): Promise<SystemSettings | undefined>;
  updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings>;

  getEscalationRules(): Promise<EscalationRule[]>;
  getEscalationRule(id: string): Promise<EscalationRule | undefined>;
  createEscalationRule(rule: InsertEscalationRule): Promise<EscalationRule>;
  updateEscalationRule(id: string, updates: Partial<EscalationRule>): Promise<EscalationRule | undefined>;
  deleteEscalationRule(id: string): Promise<boolean>;

  getGatingRules(): Promise<GatingRule[]>;
  getGatingRule(id: string): Promise<GatingRule | undefined>;
  createGatingRule(rule: InsertGatingRule): Promise<GatingRule>;
  updateGatingRule(id: string, updates: Partial<GatingRule>): Promise<GatingRule | undefined>;
  deleteGatingRule(id: string): Promise<boolean>;

  getSuppressionRules(): Promise<SuppressionRule[]>;
  getSuppressionRule(id: string): Promise<SuppressionRule | undefined>;
  createSuppressionRule(rule: InsertSuppressionRule): Promise<SuppressionRule>;
  updateSuppressionRule(id: string, updates: Partial<SuppressionRule>): Promise<SuppressionRule | undefined>;
  deleteSuppressionRule(id: string): Promise<boolean>;

  getDecisionMatrix(): Promise<DecisionMatrixEntry[]>;
  getDecisionMatrixEntry(id: string): Promise<DecisionMatrixEntry | undefined>;
  createDecisionMatrixEntry(entry: InsertDecisionMatrixEntry): Promise<DecisionMatrixEntry>;
  updateDecisionMatrixEntry(id: string, updates: Partial<DecisionMatrixEntry>): Promise<DecisionMatrixEntry | undefined>;
  deleteDecisionMatrixEntry(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getIncidents(): Promise<Incident[]> {
    return db.select().from(incidents).orderBy(desc(incidents.createdAt));
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const [result] = await db.select().from(incidents).where(eq(incidents.id, id));
    return result;
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const [result] = await db.insert(incidents).values(incident).returning();
    return result;
  }

  async updateIncident(id: string, updates: Partial<Incident>): Promise<Incident | undefined> {
    const [result] = await db.update(incidents).set(updates).where(eq(incidents.id, id)).returning();
    return result;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  }

  async getAuditLogsByIncident(incidentId: string): Promise<AuditLog[]> {
    return db.select().from(auditLogs)
      .where(eq(auditLogs.incidentId, incidentId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [result] = await db.insert(auditLogs).values(log).returning();
    return result;
  }

  async getPolicyRules(): Promise<PolicyRule[]> {
    return db.select().from(policyRules);
  }

  async getPolicyRule(id: string): Promise<PolicyRule | undefined> {
    const [result] = await db.select().from(policyRules).where(eq(policyRules.id, id));
    return result;
  }

  async createPolicyRule(rule: InsertPolicyRule): Promise<PolicyRule> {
    const [result] = await db.insert(policyRules).values(rule).returning();
    return result;
  }

  async updatePolicyRule(id: string, updates: Partial<PolicyRule>): Promise<PolicyRule | undefined> {
    const [result] = await db.update(policyRules).set(updates).where(eq(policyRules.id, id)).returning();
    return result;
  }

  async getEventSources(): Promise<EventSource[]> {
    return db.select().from(eventSources);
  }

  async createEventSource(source: InsertEventSource): Promise<EventSource> {
    const [result] = await db.insert(eventSources).values(source).returning();
    return result;
  }

  async getSettings(): Promise<SystemSettings | undefined> {
    const [result] = await db.select().from(systemSettings).where(eq(systemSettings.id, "system"));
    return result;
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const existing = await this.getSettings();
    if (!existing) {
      const [result] = await db.insert(systemSettings).values({ ...updates, id: "system" } as any).returning();
      return result;
    }
    const [result] = await db.update(systemSettings).set(updates).where(eq(systemSettings.id, "system")).returning();
    return result;
  }

  async getEscalationRules(): Promise<EscalationRule[]> {
    return db.select().from(escalationRules).orderBy(asc(escalationRules.priority));
  }

  async getEscalationRule(id: string): Promise<EscalationRule | undefined> {
    const [result] = await db.select().from(escalationRules).where(eq(escalationRules.id, id));
    return result;
  }

  async createEscalationRule(rule: InsertEscalationRule): Promise<EscalationRule> {
    const [result] = await db.insert(escalationRules).values(rule).returning();
    return result;
  }

  async updateEscalationRule(id: string, updates: Partial<EscalationRule>): Promise<EscalationRule | undefined> {
    const [result] = await db.update(escalationRules).set({ ...updates, updatedAt: new Date() }).where(eq(escalationRules.id, id)).returning();
    return result;
  }

  async deleteEscalationRule(id: string): Promise<boolean> {
    const result = await db.delete(escalationRules).where(eq(escalationRules.id, id)).returning();
    return result.length > 0;
  }

  async getGatingRules(): Promise<GatingRule[]> {
    return db.select().from(gatingRules).orderBy(desc(gatingRules.createdAt));
  }

  async getGatingRule(id: string): Promise<GatingRule | undefined> {
    const [result] = await db.select().from(gatingRules).where(eq(gatingRules.id, id));
    return result;
  }

  async createGatingRule(rule: InsertGatingRule): Promise<GatingRule> {
    const [result] = await db.insert(gatingRules).values(rule).returning();
    return result;
  }

  async updateGatingRule(id: string, updates: Partial<GatingRule>): Promise<GatingRule | undefined> {
    const [result] = await db.update(gatingRules).set({ ...updates, updatedAt: new Date() }).where(eq(gatingRules.id, id)).returning();
    return result;
  }

  async deleteGatingRule(id: string): Promise<boolean> {
    const result = await db.delete(gatingRules).where(eq(gatingRules.id, id)).returning();
    return result.length > 0;
  }

  async getSuppressionRules(): Promise<SuppressionRule[]> {
    return db.select().from(suppressionRules).orderBy(desc(suppressionRules.createdAt));
  }

  async getSuppressionRule(id: string): Promise<SuppressionRule | undefined> {
    const [result] = await db.select().from(suppressionRules).where(eq(suppressionRules.id, id));
    return result;
  }

  async createSuppressionRule(rule: InsertSuppressionRule): Promise<SuppressionRule> {
    const [result] = await db.insert(suppressionRules).values(rule).returning();
    return result;
  }

  async updateSuppressionRule(id: string, updates: Partial<SuppressionRule>): Promise<SuppressionRule | undefined> {
    const [result] = await db.update(suppressionRules).set({ ...updates, updatedAt: new Date() }).where(eq(suppressionRules.id, id)).returning();
    return result;
  }

  async deleteSuppressionRule(id: string): Promise<boolean> {
    const result = await db.delete(suppressionRules).where(eq(suppressionRules.id, id)).returning();
    return result.length > 0;
  }

  async getDecisionMatrix(): Promise<DecisionMatrixEntry[]> {
    return db.select().from(decisionMatrix).orderBy(asc(decisionMatrix.sortOrder));
  }

  async getDecisionMatrixEntry(id: string): Promise<DecisionMatrixEntry | undefined> {
    const [result] = await db.select().from(decisionMatrix).where(eq(decisionMatrix.id, id));
    return result;
  }

  async createDecisionMatrixEntry(entry: InsertDecisionMatrixEntry): Promise<DecisionMatrixEntry> {
    const [result] = await db.insert(decisionMatrix).values(entry).returning();
    return result;
  }

  async updateDecisionMatrixEntry(id: string, updates: Partial<DecisionMatrixEntry>): Promise<DecisionMatrixEntry | undefined> {
    const [result] = await db.update(decisionMatrix).set({ ...updates, updatedAt: new Date() }).where(eq(decisionMatrix.id, id)).returning();
    return result;
  }

  async deleteDecisionMatrixEntry(id: string): Promise<boolean> {
    const result = await db.delete(decisionMatrix).where(eq(decisionMatrix.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
