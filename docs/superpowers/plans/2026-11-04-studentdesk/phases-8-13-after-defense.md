# Phases 8 to 13: After the defense

**Read first:** [the overview](../2026-11-04-studentdesk.md) and spec Section 14.

These phases are ordered but not dated, and they aren't broken into code steps yet. What gets built depends on the panel's comments, what users say, and what the LMS API looks like. Each phase gets its own detailed plan when it starts, using this file as its outline. Set the dates once the final defense date is known, working backward from it.

---

## Phase 8: Requirements Planning (RAD 1)

**Goal:** replace the assumptions in the prototype with what users actually need.

- [ ] Apply the panel's comments from the oral defense to the manuscript and the system's list of changes.
- [ ] Interview faculty advisers, SSG officers, capstone leads and student members, using the interview guide.
- [ ] Observe how events and capstone projects are coordinated now, using the observation checklist. Review existing records.
- [ ] Confirm these drafts with leads and advisers, and write down each decision and who agreed:
  - The recommendation weights and the workload limit of 5
  - The readiness rules and thresholds
  - The permission rules, including whether advisers should approve or comment
  - The task categories, including whether capstone work needs "Development" or "Research"
  - Email frequency, especially the daily report
  - Whether links are enough for deliverables, or file upload is needed
- [ ] Check with the school what the Data Privacy Act of 2012 requires for student data, and what it expects from the project.
- [ ] Ask whether SSG has past event records that could become real history.
- [ ] Update the requirements list and the ERD for the manuscript.

**Done when:** the team has a signed-off requirements list, and every draft value above is confirmed or changed.

**Keep for Chapter IV:** interview notes, observation checklists, permission letters.

## Phase 9: User Design (RAD 2)

**Goal:** users agree the design fits how they work.

- [ ] Change the system to match Phase 8's decisions.
- [ ] Have representative users of all three roles try it on preview links.
- [ ] Collect their feedback, revise, and show them again. Repeat until they agree.
- [ ] Finalize the Prisma schema.

**Done when:** representative users approve the screens, and the schema is final.

**Keep for Chapter IV:** feedback from each round, and what changed because of it.

## Phase 10: Real LMS connection (RAD 3)

**Goal:** real school accounts can sign in.

**Needs:** the answers to the eight questions in spec Section 11, and a test account.

- [ ] Write `src/features/lms/live-client.ts` against the real API, with a timeout, returning `unavailable` for server errors or timeouts and `invalid` only for a wrong password.
- [ ] Test it with fake server responses for each case, then with the test account.
- [ ] If the API doesn't return email, ask for it once at first sign-in and confirm it before sending anything.
- [ ] Add sign-in rate limiting, stored in the database because serverless memory doesn't persist. For example, limit attempts per username over 15 minutes.
- [ ] If the LMS is only reachable on campus, stop and decide with the adviser and IT before going further. The options are a route through the school's network, or hosting inside the campus.
- [ ] Set `LMS_MODE=live` on a preview, then test signing in with real accounts.

**Done when:** a real student and a real teacher can sign in on a preview, and a wrong password and an LMS outage each show the right message.

## Phase 11: Finish construction (RAD 3)

**Goal:** a complete system with all modules integrated, ready for final testing.

- [ ] Add a way to add members who haven't signed in yet. Choose an email invite or a join code, based on what users preferred.
- [ ] Add anything left out that users asked for in Phases 8 and 9. Possible items are file upload and task comments.
- [ ] If real past records exist, write a one-time import script, and label the data's source.
- [ ] Tune the weights if real data shows a problem, and record why.
- [ ] Update the manuscript's stack section for anything added.

**Done when:** every module works on a preview with real sign-in, and the automated tests pass.

## Phase 12: Final testing and evaluation (RAD 4)

**Goal:** evidence for Chapter IV that the system works and meets ISO/IEC 25010.

- [ ] Write test cases for every feature, and run them on desktop and mobile browsers. Record the results.
- [ ] Run complete workflows from start to finish.
- [ ] Fix defects and retest.
- [ ] Have respondents use the system for a real activity if possible, so history builds up naturally.
- [ ] Administer the questionnaire on Functional Suitability, Reliability and Usability.
- [ ] Analyze the results and comments. Pull the suggestion acceptance rate from `TaskAssignment.recommendedRank`.
- [ ] Make the necessary final revisions.

**Done when:** test results and evaluation results are ready for Chapter IV.

## Phase 13: Deployment (RAD 4)

**Goal:** StudentDesk in real use at CCDI.

- [ ] Remove demo mode's sample accounts and data from production, and confirm `db:seed` refuses to run there.
- [ ] Add a privacy notice, based on Phase 8's findings.
- [ ] Recheck hosting. Vercel's free plan is for non-commercial personal use, so confirm with CCDI whether a school-run system fits it, or who would pay for a paid plan.
- [ ] Recheck the Gmail limit against real usage, and consider a school mail account.
- [ ] Set up the initial users and project roles.
- [ ] Orient users, and write a short user guide.
- [ ] Hand over: repo access, account ownership, and how to update the system.

**Done when:** real users are working in production, and the school knows who maintains it.
