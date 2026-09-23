// Creates one test Physician and one test Patient account, assigned
// to each other, so there's something to log in as during v1
// development. Run with: npm run db:seed
//
// Not meant for production data — this is sample/test data only,
// per the project's v1 scope (see constitution.md).

import { db } from "./index";
import { users, patientProfiles, physicianProfiles } from "./schema";
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

async function seed() {
  console.log("Seeding test accounts...");

  const [physicianUser] = await db
    .insert(users)
    .values({
      username: TEST_PHYSICIAN.username,
      passwordHash: await hashPassword(TEST_PHYSICIAN.password),
      name: TEST_PHYSICIAN.name,
      role: "physician",
    })
    .returning();

  await db.insert(physicianProfiles).values({
    userId: physicianUser.id,
  });

  const [patientUser] = await db
    .insert(users)
    .values({
      username: TEST_PATIENT.username,
      passwordHash: await hashPassword(TEST_PATIENT.password),
      name: TEST_PATIENT.name,
      role: "patient",
    })
    .returning();

  await db.insert(patientProfiles).values({
    userId: patientUser.id,
    physicianUserId: physicianUser.id,
  });

  console.log("Done. Test accounts:");
  console.log(`  Physician -> username: ${TEST_PHYSICIAN.username}  password: ${TEST_PHYSICIAN.password}`);
  console.log(`  Patient   -> username: ${TEST_PATIENT.username}  password: ${TEST_PATIENT.password}`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
