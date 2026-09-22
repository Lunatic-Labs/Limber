# Limber — Project Brief & Working Notes

## Purpose of this file
Running context for whoever (or whichever session) picks up work on Limber — captures decisions made, open questions, and where we are in the spec-driven process.

## Process
Staged, spec-driven approach: lock down vision/scope, then users, then functional detail (with acceptance criteria), then non-functional/scalability requirements, then technical architecture — each stage documented before moving to the next.

## Status
- [x] Stage 1: Problem & Vision — complete (see constitution.md)
- [x] Stage 2: Users & Personas — complete (see constitution.md, "Users & Access Model")
- [x] Stage 3: Functional Scope — complete (see constitution.md, "v1 Scope") — revised: motion-capture removed from v1, see below
- [x] Stage 4: Non-Functional / Scalability Requirements — complete (see constitution.md, "Non-Functional Requirements (v1)")
- [x] Stage 5: Technical Constraints & Preferences — complete (see constitution.md, "Technical Stack & Team")
- [ ] Stage 6: Data & Domain Model

## Decisions Log
- Core value prop: PT communication + POC tracking. (Motion-capture-based progress assessment is part of the long-term vision but is **out of v1 scope** — see below.)
- HIPAA: deferred; sample data only for v1, but flag compliance-friendly architectural choices as we go.
- Admin view: deferred to a later phase.
- Roles: Patient and Physician only for v1. One physician per patient; many patients per physician. No patient-to-patient interaction or visibility.
- Communication channel: in-app messaging (text, photos, videos, documents) with persistent chat history, scoped strictly to a patient's own physician.
- Testing philosophy: write test cases and edge-case coverage before implementing a feature; run the full suite against every new feature, not just the one being added.
- Scale target: v1 launches small/low-volume with sample data; the long-term ambition is thousands of users, but v1 itself is not being built or tuned for that scale — just shouldn't be architected in a way that blocks it.
- Availability/latency: no SLA or latency targets for v1; downtime is largely tolerable.
- Compliance: none required for v1 (sample data only, no real PHI); HIPAA readiness is a forward-looking consideration, not a v1 requirement.
- Budget: free-tier infrastructure for now (Vercel + Neon free tiers); scale-up is a known future need, so avoid decisions that make leaving free tier hard.
- Stack: Next.js (or comparable) on Vercel, Neon Postgres via Vercel, GitHub for source control. Default to common/portable choices elsewhere.
- Team: 2 developers + 1 physician as clinical advisor (not coding). Favor well-documented, low-ops tools over anything needing dedicated infra/ops work.
- **SCOPE CHANGE (Stage 5)**: Motion-capture movement assessment is explicitly **not needed for this version**. It was originally listed as a v1 core feature (Stage 1/3) but has been moved to "Open Considerations for the Future" in constitution.md. No motion-capture/pose-estimation tooling decision is needed right now.
- v2+ items that should shape v1 architecture (not to be built now, but not to be architected against):
  - Motion-capture movement assessment (moved out of v1 — see scope change above).
  - Mobile app — keep backend/API decoupled from a single (web) frontend.
  - Physician-configured exercise/reminder schedule — POC/exercise data model should be able to carry scheduling metadata later.
  - Private physician-only notes on a patient — access control should support per-note, per-role visibility, not just per-conversation visibility.
  - Progress/recovery trend graphs from motion-capture data — store motion-capture results as structured, queryable data, not just raw media, so trends can be computed without reprocessing.
  - Eventual scale to thousands of users — avoid single-tenant-only assumptions and keep motion-capture media storage/compute separable from the core app database, for whenever it's added back.

## Open Questions / Flags for Later Stages
- What does "text" communication mean technically — in-app chat, SMS integration, or both? (Stage 2 answer leans toward in-app chat with rich media; confirm no SMS requirement.)
- What defines "completing the POC correctly" — deferred along with motion capture; revisit when that feature is picked back up.
- Does "physician" mean licensed PT only, or could it include other care team roles later?
- Document/video/photo storage: size limits, retention policy, and storage backend on Vercel/Neon (Vercel Blob? external object storage?) — relevant now that hosting stack is chosen, even without motion-capture media yet.
- Test strategy: what test framework(s)/tooling will be used to write acceptance tests ahead of features, compatible with Next.js.
- No concrete launch/1yr/3yr numbers exist yet for users or data volume — worth revisiting once there's a rough go-to-market plan, since "thousands of users eventually" alone doesn't pin down infra sizing.

---
*Last updated after Stage 5 — ready to move to Stage 6: Data & Domain Model.*
