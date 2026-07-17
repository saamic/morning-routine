---
name: routine-sync
description: Reconcile the Routine PWA (morning/night routine app at gatho.co/routine) with its source Evernote notes after the user edits those notes informally. Re-reads each linked note, maps sections to app content constants, preserves the app-specific nuances (omissions, intro line, reorders, per-leg stretches, timers), then compile-checks, bumps the service-worker cache, commits, pushes, and verifies the live deploy. Use whenever the user says their Psychohabitual optimization note, Project Bend/Extend/Mend note, self-organization/priorities notes, or routine content changed and the app should follow.
---

# Routine app ↔ Evernote sync

The **Routine** app mirrors specific sections of the user's Evernote notes. When the
user changes those notes, run this skill to reconcile the app content to match.

- **Repo / folder:** `/Users/saam/Code/routine` (git remote `saamic/routine`)
- **Live:** https://www.gatho.co/routine/ (also https://saamic.github.io/routine/)
- **Structure:** a single `index.html` — inline React compiled in-browser by Babel.
  All routine content lives in JS **constants** near the top of the `<script type="text/babel">` block.
- **Evernote account for deep links:** `EN_UID = 27366594`, `EN_SHARD = s222`.

## Source-of-truth map (Evernote section → app constant)

### Note: "Psychohabitual optimization" — GUID `69829404-4ba0-4f2f-a945-f32c1f07eff9`
- **"After waking"** list → `MORNING_STEPS` (+ `MORNING_INTRO`).
  - NUANCE: the note's **first** "After waking" bullet ("Do not rush, think slowly and
    deliberately, and do things one at a time") is **NOT a step** — it is `MORNING_INTRO`,
    rendered as text above the button on the opening page.
  - NUANCE: the note bullet **"Do not aimlessly scroll media in bed" is intentionally
    OMITTED** from the app (still present in the note; do not add it back).
  - NUANCE: **"Do isometric pull-up hold (left biceps — underhand grip, ≈30–45s, a few
    rounds)"** exists in BOTH the note and the app (it was added to the note, after "Do neck training").
  - Otherwise keep step text **verbatim** from the note.
- **"Night"** list → `NIGHT_STEPS` (verbatim; the note's "Shower(<= every 3 days)/rinse
  (<= every 2 days)" is normalized to "Shower (≤ every 3 days) / rinse (≤ every 2 days)").
- **"Psychohabitual adjustments to keep in mind"** section (the top h1) → `PSYCHO`
  (nested `{t, c}` array, nesting preserved **verbatim**). Rendered as the SECOND step
  (first screen after Begin), sentinel step label `PSYCHO_STEP`.

### Note: "Project Bend, Extend, and Mend" — GUID `3075cb0e-6a21-4c3e-8173-25c1baa1f105`
- **"Mobility circuit"** → `MOBILITY` (shown on the "Do mobility training" step, reused
  for the night "Mobility training" step).
  - Sections: **Rollouts** (6 items, no timers), **Dynamic movements** (6, no timers),
    **Stretches** (timers).
  - Stretch timers use hold options **`HOLDS = [35, 95]`** seconds.
  - NUANCE — per-leg stretches (`sides: true`, two L/R checkboxes): **Half kneeling
    stretch, Couch stretch, Glute stretch / pigeon stretch, Put foot on wall and then take off.**
    Single (`sides: false`): **Elephant walk, Split stretch, Butterfly stretch.**
  - NUANCE — **Split stretch is 3rd** in the Stretches list (app AND note were reordered to match).
  - The note also has a tendon-training reference (Jeremy Ethier, "It's Weird, But It
    Re-Builds Your Tendons In 30 Days") in its References list — reference only, not app content.

### Deep links (open native apps)
- **Self-organization** step → latest self-organization note. RULE: pick the **most
  recently updated** note whose title matches `Y## Q# self-organization`
  (currently "Y32 Q1 self-organization", GUID `5ab1aac9-1483-0510-804b-9d36b34d5b28`).
  Update `DEEPLINKS.selforg` if a newer quarter appears.
- **Priorities** step → **"Priorities"** note, GUID `96537671-bc0b-ab2d-fb94-c1246eff009b`
  (NOT the old "Life priorities" note).
- **To-do** step → `todoist://today`.
- Link format: `evernote:///view/${EN_UID}/${EN_SHARD}/${guid}/${guid}/`.

### Not from a note
- **Meditate** and **Walk, joint rollout** steps get a **5-minute** `StepTimer`
  (`STEP_TIMER_SECONDS = 300`), detected via `hasStepTimer()` (matches "meditate" / "joint rollout").
- **Neck training:** the "Do neck training" step has **no checklist yet** — no Evernote
  source was found. If the user provides neck exercises, add a checklist like `MobilityChecklist`
  (note per-side / timed as they specify) and record the source note here.

## Sync procedure
1. **Fetch** each relevant note via the Evernote MCP `get_note` (by GUID above).
2. **Diff** each mapped section against its app constant. **Preserve every NUANCE above**
   (the intro-line move, the "aimlessly scroll" omission, the isometric-hold step,
   Split-stretch single + 3rd, per-leg `sides`, stretch-only timers, deeplink selection rule).
3. **Edit** the constants in `index.html`.
4. **Compile-check** (must pass before committing):
   ```bash
   cd /Users/saam/Code/routine
   node -e 'const fs=require("fs");const m=fs.readFileSync("index.html","utf8").match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);fs.writeFileSync("/tmp/routine.jsx",m[1]);'
   # in a dir with @babel/standalone installed:
   node -e 'const b=require("@babel/standalone");b.transform(require("fs").readFileSync("/tmp/routine.jsx","utf8"),{presets:["react"]});console.log("ok")'
   ```
5. **Bump** the service-worker cache: `CACHE = "routine-vN"` → `vN+1` in `sw.js`
   (forces clients to pick up the new shell).
6. **Commit + push** to `main`; wait for the Pages build (`gh api repos/saamic/routine/pages/builds/latest --jq .status` → `built`).
7. **Verify** live (CDN purge lags; Pages ignores query strings for cache, so poll):
   `curl -sL https://www.gatho.co/routine/ | grep -o '<your changed text>'`.
8. **Adversarial check (recommended):** launch a subagent that independently re-reads the
   source notes via the Evernote MCP and reproduces the mapped sections, then diffs against
   the app constants and reports any mismatch. Treat any diff not explained by a documented
   NUANCE as a bug to fix.

## Verbatim policy
App step/section text must match the note wording **exactly**, except the documented
nuances. When unsure, quote the note rather than paraphrasing.
