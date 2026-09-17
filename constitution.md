# Limber — Project Constitution

## Vision
Limber is a physical therapy platform that closes the gap between patients and physical therapists between in-person sessions, through direct communication and objective movement tracking — so recovery stays consistent and physicians can adjust care based on real data, not just patient self-report.

## Core Principles
1. **Patient-Physician Connection First** — the primary value is uninterrupted communication tied to a specific Plan of Care (POC).
2. **Objective Progress Over Self-Report** — motion capture exists to give physicians verifiable movement data, not to replace clinical judgment.
3. **Adaptable by Design** — architecture should not assume a single PT practice model; it should be extensible to different clinical contexts within physical therapy.
4. **Simplicity for the End User** — patients and physicians should not need training to use core features.
5. **Privacy-Minded from Day One** — even though v1 uses sample data and is not HIPAA-compliant, decisions should not paint us into a corner that makes future compliance hard.

## v1 Scope
- Patient ↔ Physician messaging (text, photos, documents) tied to a specific Plan of Care
- Physician calendar: view all sessions, click into a session to see patient progress/notes, set notification reminders
- Patient calendar: view upcoming sessions, add notes, request reschedule
- Motion-capture movement assessment: camera-based capture of the patient performing POC exercises, analyzed for correctness, results shared with the physician for progress assessment

## Explicitly Out of Scope for v1
- Admin/management view (planned for a later phase)
- HIPAA compliance / production PHI handling (deploying with sample data only for now)

## Open Considerations for the Future
- **HIPAA readiness**: note architectural decisions now that would ease a future compliance pass (encryption at rest/in transit, audit logging, granular access controls, BAA-ready infrastructure) — to be expanded once we reach a security/compliance stage.

---
*Version 1 — drafted from Stage 1 answers.*
