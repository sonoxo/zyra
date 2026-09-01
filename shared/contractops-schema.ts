import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { organizations, users } from "./schema";

export const contractopsRegistrations = pgTable(
  "contractops_registrations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    system: text("system").notNull(),
    identifier: text("identifier"),
    status: text("status").notNull().default("PENDING"),
    verificationSource: text("verification_source"),
    verifiedAt: timestamp("verified_at"),
    notes: text("notes"),
    updatedById: varchar("updated_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    organizationSystemUnique: uniqueIndex("contractops_registration_org_system_unique").on(
      table.organizationId,
      table.system,
    ),
  }),
);

export const contractopsOpportunities = pgTable("contractops_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  agency: text("agency").notNull(),
  sourceUrl: text("source_url").notNull(),
  solicitationNumber: text("solicitation_number"),
  deadline: timestamp("deadline"),
  naics: text("naics"),
  psc: text("psc"),
  setAside: text("set_aside"),
  summary: text("summary"),
  requirements: jsonb("requirements").notNull().default(sql`'[]'::jsonb`),
  evidenceMatches: jsonb("evidence_matches").notNull().default(sql`'[]'::jsonb`),
  bidAssessment: jsonb("bid_assessment"),
  status: text("status").notNull().default("CAPTURED"),
  bidDecision: text("bid_decision").notNull().default("UNDER_REVIEW"),
  evidenceCoverageReady: boolean("evidence_coverage_ready").notNull().default(false),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contractopsProposals = pgTable(
  "contractops_proposals",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    opportunityId: varchar("opportunity_id").notNull().references(() => contractopsOpportunities.id),
    title: text("title").notNull(),
    status: text("status").notNull().default("DRAFTING"),
    reviewDecision: text("review_decision").notNull().default("PENDING"),
    blockers: jsonb("blockers").notNull().default(sql`'[]'::jsonb`),
    readiness: jsonb("readiness").notNull().default(sql`'{}'::jsonb`),
    createdById: varchar("created_by_id").references(() => users.id),
    reviewedById: varchar("reviewed_by_id").references(() => users.id),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    organizationOpportunityUnique: uniqueIndex("contractops_proposal_org_opportunity_unique").on(
      table.organizationId,
      table.opportunityId,
    ),
  }),
);

export const contractopsProposalSections = pgTable(
  "contractops_proposal_sections",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    organizationId: varchar("organization_id").notNull().references(() => organizations.id),
    proposalId: varchar("proposal_id").notNull().references(() => contractopsProposals.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    ordinal: integer("ordinal").notNull().default(0),
    content: text("content").notNull().default(""),
    status: text("status").notNull().default("DRAFT"),
    requirementRefs: jsonb("requirement_refs").notNull().default(sql`'[]'::jsonb`),
    evidenceRefs: jsonb("evidence_refs").notNull().default(sql`'[]'::jsonb`),
    updatedById: varchar("updated_by_id").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    proposalSectionKeyUnique: uniqueIndex("contractops_proposal_section_key_unique").on(
      table.proposalId,
      table.key,
    ),
  }),
);

export type ContractOpsRegistrationRow = typeof contractopsRegistrations.$inferSelect;
export type ContractOpsOpportunityRow = typeof contractopsOpportunities.$inferSelect;
export type ContractOpsProposalRow = typeof contractopsProposals.$inferSelect;
export type ContractOpsProposalSectionRow = typeof contractopsProposalSections.$inferSelect;
