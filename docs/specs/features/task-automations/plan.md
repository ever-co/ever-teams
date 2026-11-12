# Implementation Plan: Settings → Automations

**Feature**: `task-automations` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/task-automations`

## Pieces (`apps/web`)

| Piece | Where |
| --- | --- |
| Flag | `core/lib/utils/task-automations-enabled.ts` (`readRuntimeEnv` first) |
| Types (the platform's contract) | `core/types/interfaces/common/task-automation.ts` |
| Client | `core/services/client/api/task-automations/task-automations.service.ts` |
| Proxies | `app/api/task-automations/**` (`forwardToGauzy`; ids encoded to one segment) |
| Query keys | `queryKeys.taskAutomations.{templates,rules,runs}` (tenant, organization, user) |
| Hooks | `core/hooks/task-automations/use-task-automations.ts`: scope, availability probe (`GET /templates`: 404 → unavailable, 403 → forbidden), rules, runs, actions (optimistic switch and reorder) |
| Form ↔ rule | `core/lib/utils/task-automations.ts`: drafts with keys, per-type input, validation, ordering, outcome tones |
| Page | `core/components/settings/pages/automations/*` (list, editor, template picker, dry run, history, skeleton) |
| Entry | `settings-entries.ts` (`automations`, manager-only) + `useHiddenSettingsEntries` (flag and probe) |
| Route | `app/[locale]/(main)/settings/team/automations/page.tsx` |
| Strings | `settings.entries.automations`, `settings.automations.*` in the 13 locales |

## Rules

- Nothing is requested while the flag is off; the probe runs only for a manager.
- Statuses and priorities are named by value (shared by every project's row); labels and people by id.
- The template's name and description are shown from the app's strings by template key, the platform's English
  otherwise.
