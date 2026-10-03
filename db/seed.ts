// Creates one test Physician and one test Patient account, assigned
// to each other, plus a sample Plan of Care with a few messages, so
// there's something to log in as and chat in during v1 development.
// Run with: npm run db:seed
// Safe to re-run: existing accounts and plans are left alone.
// Not meant for production data — this is sample/test data only,
// per the project's v1 scope (see constitution.md).

import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  messages,
  patientProfiles,
  physicianProfiles,
  plansOfCare,
  users,
} from "./schema";
import { hashPassword } from "../lib/password";

const TEST_PHYSICIAN = {
  username: "physician1",
  password: "changeme123",
  name: "Dr. Test Physician",
};

const TEST_PATIENT = {
  username: "patient1",
  password: "changeme123",
  name: "Test Patient",
};

async function findUser(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  return user;
}

async function seed() {
  console.log("Seeding test accounts...");

  let physicianUser = await findUser(TEST_PHYSICIAN.username);
  if (!physicianUser) {
    [physicianUser] = await db
      .insert(users)
      .values({
        username: TEST_PHYSICIAN.username,
        passwordHash: await hashPassword(TEST_PHYSICIAN.password),
        name: TEST_PHYSICIAN.name,
        role: "physician",
      })
      .returning();
  }
  await db
    .insert(physicianProfiles)
    .values({ userId: physicianUser.id })
    .onConflictDoNothing();

  let patientUser = await findUser(TEST_PATIENT.username);
  if (!patientUser) {
    [patientUser] = await db
      .insert(users)
      .values({
        username: TEST_PATIENT.username,
        passwordHash: await hashPassword(TEST_PATIENT.password),
        name: TEST_PATIENT.name,
        role: "patient",
      })
      .returning();
  }
  await db
    .insert(patientProfiles)
    .values({ userId: patientUser.id, physicianUserId: physicianUser.id })
    .onConflictDoNothing();

  // Sample Plan of Care (+ a few messages) for the chat UI.
  const [existingPlan] = await db
    .select({ id: plansOfCare.id })
    .from(plansOfCare)
    .where(
      and(
        eq(plansOfCare.patientUserId, patientUser.id),
        eq(plansOfCare.physicianUserId, physicianUser.id)
      )
    )
    .limit(1);

  if (!existingPlan) {
    const [plan] = await db
      .insert(plansOfCare)
      .values({
        patientUserId: patientUser.id,
        physicianUserId: physicianUser.id,
        title: "Sample plan of care",
        description: "Sample data for development.",
        startDate: new Date(),
      })
      .returning();

    const now = Date.now();
    await db.insert(messages).values([
      {
        planOfCareId: plan.id,
        senderUserId: physicianUser.id,
        body: "Hi! Welcome to Limber. How did the exercises go this week?",
        createdAt: new Date(now - 3 * 60_000),
      },
      {
        planOfCareId: plan.id,
        senderUserId: patientUser.id,
        body: "Pretty good! My knee felt a little stiff on the squats though.",
        createdAt: new Date(now - 2 * 60_000),
      },
      {
        planOfCareId: plan.id,
        senderUserId: patientUser.id,
        body: "Should I keep going or back off a bit?",
        createdAt: new Date(now - 60_000),
      },
    ]);
    console.log("Created a sample plan of care with 3 messages.");
  }

  console.log("Done. Test accounts:");
  console.log(`  Physician -> username: ${TEST_PHYSICIAN.username}  password: ${TEST_PHYSICIAN.password}`);
  console.log(`  Patient   -> username: ${TEST_PATIENT.username}  password: ${TEST_PATIENT.password}`);
}

// Set exitCode instead of calling process.exit(): exiting while the
// HTTP connection is still closing triggers a libuv assertion on Windows.
seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exitCode = 1;
});
