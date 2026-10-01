// TEMPORARY: lets the patient UI be viewed without signing in or hitting
// the database. Enabled only outside production, and only when
// NEXT_PUBLIC_DEV_PATIENT_PREVIEW=true. Remove once the DB/auth is working.
export const DEV_PATIENT_PREVIEW =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_PATIENT_PREVIEW === "true";

export const MOCK_PATIENT = { id: "dev-patient", name: "Dev Patient" };

export const MOCK_PATIENT_DASHBOARD = {
  physician: { name: "Dev Physician", username: "physician1" },
  pocs: [
    { id: "dev-poc-1", title: "Knee rehab (post-op)", status: "active" },
    { id: "dev-poc-2", title: "Shoulder mobility", status: "completed" },
  ],
};
