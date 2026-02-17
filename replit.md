# Zero-Trust Autonomous Incident Triage Agent

## Overview
AI-driven incident classification, escalation, and Major Incident Management (MIM) orchestration dashboard. Visualizes a zero-trust triage pipeline with incident management, AI classification details, policy engine configuration, audit trails, and maturity model controls.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State**: TanStack React Query

## Data Models
- **incidents**: Alert events with AI classification, confidence scores, status, source, integration IDs (SNOW/PD/MIM)
- **auditLogs**: Complete decision audit trail with actors, actions, correlation IDs
- **policyRules**: Deterministic escalation rules with enable/disable toggles
- **eventSources**: Connected platform integrations with heartbeat tracking
- **systemSettings**: Maturity level (0-3), thresholds, feature flags

## Pages
- `/` - Dashboard with metrics, charts, recent incidents
- `/incidents` - Filterable incident list
- `/incidents/:id` - Incident detail with AI reasoning, audit trail, integration IDs
- `/policies` - Policy engine with toggleable rules
- `/audit` - Searchable audit trail
- `/sources` - Event source status monitoring
- `/settings` - Maturity model selector, escalation controls, thresholds

## API Endpoints
- `GET/POST /api/incidents` - List/create incidents
- `GET/PATCH /api/incidents/:id` - Get/update incident
- `GET /api/audit` - All audit logs
- `GET /api/audit/:incidentId` - Audit logs for specific incident
- `GET/PATCH /api/policies` - List/update policy rules
- `GET /api/sources` - Event sources
- `GET/PATCH /api/settings` - System settings

## Key Features
- Maturity model toggles (Level 0-3)
- AI classification with confidence scoring
- Deterministic policy engine with governance controls
- Full audit trail with correlation tracking
- Dark/light theme support
