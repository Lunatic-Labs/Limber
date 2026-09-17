# Limber — Project Brief & Working Notes

## Purpose of this file
Running context for whoever (or whichever session) picks up work on Limber — captures decisions made, open questions, and where we are in the spec-driven process.

## Process
Staged, spec-driven approach: lock down vision/scope, then users, then functional detail (with acceptance criteria), then non-functional/scalability requirements, then technical architecture — each stage documented before moving to the next.

## Status
- [x] Stage 1: Problem & Vision — complete (see constitution.md)
- [ ] Stage 2: Users & Personas
- [ ] Stage 3: Functional Scope (detailed acceptance criteria)
- [ ] Stage 4: Non-Functional / Scalability Requirements
- [ ] Stage 5: Technical Constraints & Preferences
- [ ] Stage 6: Data & Domain Model

## Decisions Log
- Core value prop: PT communication + POC tracking + motion-capture-based progress assessment.
- HIPAA: deferred; sample data only for v1, but flag compliance-friendly architectural choices as we go.
- Admin view: deferred to a later phase.

## Open Questions / Flags for Later Stages
- What does "text" communication mean technically — in-app chat, SMS integration, or both?
- Motion capture: on-device processing vs. server-side, real-time feedback vs. post-session review? (Directly affects scalability/infra requirements.)
- What defines "completing the POC correctly" — a rules/rubric engine per exercise, or an ML-based movement classification model?
- Does "physician" mean licensed PT only, or could it include other care team roles later?

---
*Last updated after Stage 1.*
