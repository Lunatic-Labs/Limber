# Limber — Project Brief & Working Notes

## Purpose of this file
Running context for whoever (or whichever session) picks up work on Limber — captures decisions made, open questions, and where we are in the spec-driven process.

## Process
Staged, spec-driven approach: lock down vision/scope, then users, then functional detail (with acceptance criteria), then non-functional/scalability requirements, then technical architecture — each stage documented before moving to the next.

## Status
- [x] Stage 1: Problem & Vision — complete (see constitution.md)
- [x] Stage 2: Users & Personas — complete (see constitution.md, "Users & Access Model")
- [x] Stage 3: Functional Scope — complete (see constitution.md, "v1 Scope")
- [ ] Stage 4: Non-Functional / Scalability Requirements
- [ ] Stage 5: Technical Constraints & Preferences
- [ ] Stage 6: Data & Domain Model

## Decisions Log
- Core value prop: PT communication + POC tracking + motion-capture-based progress assessment.
- HIPAA: deferred; sample data only for v1, but flag compliance-friendly architectural choices as we go.
- Admin view: deferred to a later phase.
- Roles: Patient and Physician only for v1. One physician per patient; many patients per physician. No patient-to-patient interaction or visibility.
- Communication channel: in-app messaging (text, photos, videos, documents) with persistent chat history, scoped strictly to a patient's own physician.
- Testing philosophy: write test cases and edge-case coverage before implementing a feature; run the full suite against every new feature, not just the one being added.
- v2+ items that should shape v1 architecture (not to be built now, but not to be architected against):
  - Mobile app — keep backend/API decoupled from a single (web) frontend.
  - Physician-configured exercise/reminder schedule — POC/exercise data model should be able to carry scheduling metadata later.
  - Private physician-only notes on a patient — access control should support per-note, per-role visibility, not just per-conversation visibility.
  - Progress/recovery trend graphs from motion-capture data — store motion-capture results as structured, queryable data, not just raw media, so trends can be computed without reprocessing.

## Open Questions / Flags for Later Stages
- What does "text" communication mean technically — in-app chat, SMS integration, or both? (Stage 2 answer leans toward in-app chat with rich media; confirm no SMS requirement.)
- Motion capture: on-device processing vs. server-side, real-time feedback vs. post-session review? (Directly affects scalability/infra requirements — Stage 4.)
- What defines "completing the POC correctly" — a rules/rubric engine per exercise, or an ML-based movement classification model?
- Does "physician" mean licensed PT only, or could it include other care team roles later?
- Document/video/photo storage: size limits, retention policy, and storage backend (affects Stage 4 scalability planning).
- Test strategy: what test framework(s)/tooling will be used to write acceptance tests ahead of features (ties into Stage 5, technical constraints).

---
*Last updated after Stage 3.*
