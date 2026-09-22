# Limber — Project Constitution

## Vision
Limber is a physical therapy platform that closes the gap between patients and physical therapists between in-person sessions, through direct communication and objective movement tracking — so recovery stays consistent and physicians can adjust care based on real data, not just patient self-report.

## Core Principles
1. **Patient-Physician Connection First** — the primary value is uninterrupted communication tied to a specific Plan of Care (POC).
2. **Objective Progress Over Self-Report** — motion capture exists to give physicians verifiable movement data, not to replace clinical judgment.
3. **Adaptable by Design** — architecture should not assume a single PT practice model; it should be extensible to different clinical contexts within physical therapy.
4. **Simplicity for the End User** — patients and physicians should not need training to use core features.
5. **Privacy-Minded from Day One** — even though v1 uses sample data and is not HIPAA-compliant, decisions should not paint us into a corner that makes future compliance hard.

## Users & Access Model
- Two roles for v1: **Patient** and **Physician**.
- A physician can have many patients; a patient has exactly one physician.
- Patients cannot see or interact with other patients — no patient-to-patient communication or visibility.
- A patient can only message their own physician, and vice versa (access is scoped per patient-physician relationship, not open to all physicians/patients on the platform).
- Target technical sophistication: average user — if someone can use a standard messaging app (texting, iMessage, WhatsApp), they should be able to use Limber without training.

## v1 Scope

### Core Features
- Separate login/auth flows for Patient and Physician roles
- Patient ↔ Physician messaging, scoped to each patient's own physician (no cross-patient visibility)
- Send text messages
- Send photos
- Send videos
- Send documents
- Persistent chat history per patient-physician pair
- Physician calendar: view all sessions, click into a session to see patient progress/notes, set notification reminders
- Patient calendar: view upcoming sessions, add notes, request reschedule
- Motion-capture movement assessment: camera-based capture of the patient performing POC exercises, analyzed for correctness, results shared with the physician for progress assessment

### Quality Bar
Test cases and edge-case coverage are written **before** a feature is implemented, and the full test suite is run against every new feature added (not just the feature under development). This applies to every core feature above.

## Explicitly Out of Scope for v1
- Admin/management view (planned for a later phase)
- HIPAA compliance / production PHI handling (deploying with sample data only for now)

## Open Considerations for the Future
- **HIPAA readiness**: note architectural decisions now that would ease a future compliance pass (encryption at rest/in transit, audit logging, granular access controls, BAA-ready infrastructure) — to be expanded once we reach a security/compliance stage.
- **Mobile application**: v1 should not make architectural choices (e.g., web-only APIs, browser-only camera access patterns) that would block a future native or cross-platform mobile client. Prefer a backend/API layer that isn't coupled to a single frontend.
- **Scheduled exercise reminders**: physicians will eventually be able to configure a recurring reminder/schedule component per patient (do your exercises, log your session). The data model for POC/exercises should be able to carry scheduling metadata later without a redesign.
- **Private physician notes**: physicians will eventually be able to attach notes to a patient that are visible only to that physician (not shared with the patient or other physicians). Access-control model should support per-note, per-role visibility, not just per-conversation visibility.
- **Progress/recovery trend graphs**: physicians will eventually see graphs of patient activity and recovery trends derived from motion-capture and session data. Motion-capture results should be stored as structured, queryable data (not just raw media) so trends can be computed later without reprocessing history.

---
*Version 2 — updated through Stage 3 answers.*
