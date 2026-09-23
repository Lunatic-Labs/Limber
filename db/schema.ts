import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  uuid,
  integer,
  bigint,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// Enums
// ============================================================

export const userRoleEnum = pgEnum("user_role", [
  "patient",
  "physician",
  "administrator",
]);

export const planOfCareStatusEnum = pgEnum("plan_of_care_status", [
  "active",
  "completed",
  "archived",
]);

export const attachmentKindEnum = pgEnum("attachment_kind", [
  "photo",
  "video",
  "document",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "reschedule_requested",
  "canceled",
  "completed",
]);

// ============================================================
// Auth.js (NextAuth) required tables
// Shape follows the @auth/drizzle-adapter convention, extended
// with `role` so the app can distinguish Patient / Physician /
// Administrator from the moment a user signs in.
// ============================================================

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  // Nullable for now: v1 auth is username/password (see `username` /
  // `passwordHash` below). Email is kept on the table, unique but
  // optional, so the planned future email-magic-link option can be
  // added without a schema change.
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // v1 auth: username/password (Credentials provider). Nullable
  // passwordHash so a future email/OAuth-only user isn't forced to
  // have one.
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ============================================================
// Role profile tables
// One row per user in the profile table matching their `role`.
// Kept separate from `users` so role-specific fields don't
// pollute the auth-owned table, and so new roles/fields are
// additive rather than reshaping `users`.
// ============================================================

export const physicianProfiles = pgTable("physician_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const patientProfiles = pgTable("patient_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // A patient's currently assigned physician (one physician per
  // patient at a time). Individual PlansOfCare below also record
  // their own physicianUserId, so history is preserved even if a
  // patient is ever reassigned to a different physician.
  physicianUserId: uuid("physician_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Administrator: oversees patient/physician interaction at the
// data-model level. No admin-facing UI/workflows in v1 — this
// table exists so the role and relationship are modeled now.
export const administratorProfiles = pgTable("administrator_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// Core domain tables
// ============================================================

// Plan of Care: the anchor entity connecting a Patient and
// Physician. A patient may have multiple PlansOfCare over time
// (sequential episodes of care), each with its own message
// history and appointments.
export const plansOfCare = pgTable("plan_of_care", {
  id: uuid("id").defaultRandom().primaryKey(),
  patientUserId: uuid("patient_user_id")
    .notNull()
    .references(() => users.id),
  physicianUserId: uuid("physician_user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: planOfCareStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date", { mode: "date" }).notNull(),
  endDate: timestamp("end_date", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Message: text and/or attachments, always tied to a specific
// Plan of Care (not just the patient-physician pair in general).
// `body` is nullable to allow attachment-only messages (e.g., a
// patient sends a video with no caption).
// No read-receipt/unread tracking in v1 (by design).
export const messages = pgTable("message", {
  id: uuid("id").defaultRandom().primaryKey(),
  planOfCareId: uuid("plan_of_care_id")
    .notNull()
    .references(() => plansOfCare.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id")
    .notNull()
    .references(() => users.id),
  body: text("body"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Attachment: photo, video, or document on a Message. The file
// itself lives in Vercel Blob; this row is just the pointer +
// metadata. Type/size limits are enforced at the app layer, not
// the schema layer (per Stage 7 answer).
export const attachments = pgTable("attachment", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  kind: attachmentKindEnum("kind").notNull(),
  blobUrl: text("blob_url").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointment: intentionally lightweight. Sessions themselves
// happen outside the app — physicians are not required to record
// structured session data here. This table exists to drive the
// Patient/Physician calendar views (Stage 3): when is the next
// session, and has the patient flagged a reschedule request.
// "Request reschedule" is a flag + free-text note, not an
// approval workflow, per Stage 7 answer.
export const appointments = pgTable("appointment", {
  id: uuid("id").defaultRandom().primaryKey(),
  planOfCareId: uuid("plan_of_care_id")
    .notNull()
    .references(() => plansOfCare.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  rescheduleRequested: boolean("reschedule_requested")
    .notNull()
    .default(false),
  rescheduleNote: text("reschedule_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// Relations (for Drizzle's relational query API)
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  patientProfile: one(patientProfiles, {
    fields: [users.id],
    references: [patientProfiles.userId],
  }),
  physicianProfile: one(physicianProfiles, {
    fields: [users.id],
    references: [physicianProfiles.userId],
  }),
  administratorProfile: one(administratorProfiles, {
    fields: [users.id],
    references: [administratorProfiles.userId],
  }),
  sentMessages: many(messages),
}));

export const patientProfilesRelations = relations(
  patientProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [patientProfiles.userId],
      references: [users.id],
    }),
    physician: one(users, {
      fields: [patientProfiles.physicianUserId],
      references: [users.id],
    }),
  })
);

export const plansOfCareRelations = relations(
  plansOfCare,
  ({ one, many }) => ({
    patient: one(users, {
      fields: [plansOfCare.patientUserId],
      references: [users.id],
    }),
    physician: one(users, {
      fields: [plansOfCare.physicianUserId],
      references: [users.id],
    }),
    messages: many(messages),
    appointments: many(appointments),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  planOfCare: one(plansOfCare, {
    fields: [messages.planOfCareId],
    references: [plansOfCare.id],
  }),
  sender: one(users, {
    fields: [messages.senderUserId],
    references: [users.id],
  }),
  attachments: many(attachments),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  message: one(messages, {
    fields: [attachments.messageId],
    references: [messages.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  planOfCare: one(plansOfCare, {
    fields: [appointments.planOfCareId],
    references: [plansOfCare.id],
  }),
}));
