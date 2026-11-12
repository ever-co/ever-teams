# Feature Specification: Settings → Automations (task automations)

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `task-automations`
**Branch**: `feat/task-automations`
**Status**: `Draft`
**Created**: 2026-11-11
**Last updated**: 2026-11-11
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED` (default off; only the exact value `true` turns it on; read at run time)
**Platform API dependency**: platform spec `task-automations` (ever-gauzy `docs/specs/features/task-automations/`,
plugin `@gauzy/plugin-task-automations` behind `GAUZY_TASK_AUTOMATIONS_ENABLED`, routes `/api/task-automations/**`)

---

## 1. Overview

A team manager opens **Settings → Automations** and sees the automation rules of the team's organization: what
sets each rule off, what it changes, where it applies, when it last ran, and whether it is on. They create a rule
from one of the platform's templates or from scratch, edit its trigger, conditions and actions with the team's own
statuses, priorities, labels and members, put the rules in the order they run in, try a rule on a task without
changing anything, read its recent runs, and delete it. The rules themselves run on the platform, in the
background; this page only manages them.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a manager with the flag on and a platform that runs automations, **when** they open Settings, **then**
  the Team group lists **Automations**; the page lists the rules in their order with a switch each.
- **Given** the empty page, **when** the manager chooses **New rule** and the template "Close the parent when all
  sub-tasks are done", **then** the editor opens filled in from the template (in their language); saving lists the
  rule, switched on.
- **Given** the template "When the status changes, set the assignee, label or priority", **when** it is picked,
  **then** the editor opens with the rule switched off and asks for the statuses and the value to set.
- **Given** a rule, **when** the manager flips its switch, **then** it changes at once; if the platform refuses, it
  flips back and a toast says why.
- **Given** two rules, **when** the manager moves the second one up, **then** the list shows the new order at once
  and the platform keeps it.
- **Given** a rule, **when** the manager chooses **Test** and picks one of the team's tasks, **then** they see
  whether the trigger applies (or that only a change of the task can tell), each condition met or not, each change
  the rule would make (from → to), and the result — and nothing is changed.
- **Given** a rule that ran, **when** the manager opens **History**, **then** they see its last runs newest first:
  the task, when, the outcome, what changed, and whether another automation set it off.
- **Given** a rule, **when** the manager deletes it and confirms, **then** it leaves the list with its history.

### 2.2 Edge cases & failures

- **Given** the flag off (the default), **then** no Automations entry is listed, `/settings/team/automations`
  answers "not found", and nothing is asked of the platform.
- **Given** the flag on and a platform without the plugin (its routes answer 404), **then** the entry is not listed
  and the page says automations are not available.
- **Given** a person the platform refuses (403), **then** the page says they cannot manage automations.
- **Given** a member who is not a manager, **then** the entry is not listed and the page says it is for managers.
- **Given** a form without a name, an action without its value, or a condition without values, **when** saved,
  **then** the editor points at the field and nothing is sent.
- **Given** a platform failure (offline, a 5xx), **then** the page offers a retry.

## 3. Functional Requirements

- **FR-1** The entry and the page MUST exist only with `NEXT_PUBLIC_TASK_AUTOMATIONS_ENABLED=true`, and the entry
  MUST hide while the platform answers 404 for the automations.
- **FR-2** The page MUST list the organization's rules in the platform's order with name, trigger → actions, scope,
  last run and a switch; switching and reordering MUST show at once and roll back on a refusal.
- **FR-3** Creating MUST offer a blank rule and every platform template (translated names; the link-closed template
  says it needs an integration).
- **FR-4** The editor MUST edit name, description, scope (project, team), the trigger (with to / from statuses for a
  status change), up to 10 conditions and up to 10 actions, picking from the team's statuses, priorities, labels and
  members; it MUST send for each type exactly the fields the platform reads.
- **FR-5** The dry run MUST call `POST /task-automations/:id/test` and show the trigger, the conditions, the changes
  and the outcome; it MUST change nothing.
- **FR-6** The history MUST show the last 50 runs (`GET /task-automations/:id/runs`).
- **FR-7** Both transports MUST work: the platform directly, or this app's `/api/task-automations/**` proxies.
- **FR-8** Every string MUST exist in the 13 locales.

## 4. Non-Functional Requirements

- **Privacy**: every read names the organization; cached data is keyed by tenant, organization and user.
- **Accessibility**: every control has a label; pickers are toggle buttons; dialogs keep focus.
- **Compatibility**: a platform without the plugin keeps the app exactly as before.

## 5. Out of Scope

- Rules across organizations, webhooks, recurring tasks; the rules' execution (the platform's).

## 6. Acceptance Criteria

- [ ] Flag off: no entry, 404 page, no request. Flag on and 404: no entry. 403: no-permission message.
- [ ] Create from template and blank, edit, switch, reorder, delete, test and history against a platform with the plugin.
- [ ] Specs: flag, service proxies, hooks (availability, optimistic switch and reorder), form ↔ rule mapping.

## 7. References

- Platform: ever-gauzy `docs/specs/features/task-automations/spec.md`
- Plan: [`plan.md`](./plan.md) · Tasks: [`tasks.md`](./tasks.md)
