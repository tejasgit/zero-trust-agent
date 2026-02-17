import {
  type Incident, type InsertIncident,
  type AuditLog, type InsertAuditLog,
  type PolicyRule, type InsertPolicyRule,
  type EventSource, type InsertEventSource,
  type SystemSettings, type InsertSystemSettings,
  incidents, auditLogs, policyRules, eventSources, systemSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
