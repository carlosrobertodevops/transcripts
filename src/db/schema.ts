import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  boolean,
  integer,
  real,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const transcriptStatusEnum = pgEnum("transcript_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "done",
  "failed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transcripts = pgTable("transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  operationName: text("operation_name"),
  operationDate: timestamp("operation_date"),
  transcriptionDate: timestamp("transcription_date"),
  analysis: text("analysis"),
  status: transcriptStatusEnum("status").default("pending").notNull(),
  position: integer("position").default(0),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  transcriptId: uuid("transcript_id")
    .notNull()
    .references(() => transcripts.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes"),
  storagePath: text("storage_path"),
  durationSeconds: real("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcriptionJobs = pgTable("transcription_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  attempts: integer("attempts").default(0),
  error: text("error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transcriptSegments = pgTable("transcript_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
  text: text("text").notNull(),
});

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transcriptId: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedWithUserId: uuid("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canEdit: boolean("can_edit").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("shares_transcript_user_idx").on(
      table.transcriptId,
      table.sharedWithUserId
    ),
  ]
);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transcripts: many(transcripts),
  sharesOwned: many(shares, { relationName: "owner" }),
  sharesReceived: many(shares, { relationName: "sharedWith" }),
  notifications: many(notifications),
}));

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  owner: one(users, { fields: [transcripts.ownerId], references: [users.id] }),
  media: many(media),
  shares: many(shares),
}));

export const mediaRelations = relations(media, ({ one, many }) => ({
  transcript: one(transcripts, {
    fields: [media.transcriptId],
    references: [transcripts.id],
  }),
  jobs: many(transcriptionJobs),
  segments: many(transcriptSegments),
}));

export const transcriptionJobsRelations = relations(
  transcriptionJobs,
  ({ one }) => ({
    media: one(media, {
      fields: [transcriptionJobs.mediaId],
      references: [media.id],
    }),
  })
);

export const transcriptSegmentsRelations = relations(
  transcriptSegments,
  ({ one }) => ({
    media: one(media, {
      fields: [transcriptSegments.mediaId],
      references: [media.id],
    }),
  })
);

export const sharesRelations = relations(shares, ({ one }) => ({
  transcript: one(transcripts, {
    fields: [shares.transcriptId],
    references: [transcripts.id],
  }),
  owner: one(users, {
    fields: [shares.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  sharedWithUser: one(users, {
    fields: [shares.sharedWithUserId],
    references: [users.id],
    relationName: "sharedWith",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
