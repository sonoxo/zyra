import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
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
  status: text("status").notNull().default("CAPTURED"),
  bidDecision: text("bid_decision").notNull().default("UNDER_REVIEW"),
  evidenceCoverageReady: boolean("evidence_coverage_ready").notNull().default(false),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ContractOpsRegistrationRow = typeof contractopsRegistrations.$inferSelect;
export type ContractOpsOpportunityRow = typeof contractopsOpportunities.$inferSelect;
