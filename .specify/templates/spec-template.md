# Feature Specification: [FEATURE NAME]

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `[short-slug]`
**Branch**: `feat/[short-slug]`
**Status**: `Draft` | `In Review` | `Approved` | `Implemented` | `Retrospective`
**Created**: YYYY-MM-DD
**Last updated**: YYYY-MM-DD
**Owner**: [GitHub handle]
**Runtime flag**: `NEXT_PUBLIC_[FLAG]` (default off)
**Platform API dependency**: [platform spec / endpoints this feature needs]

---

## 1. Overview

One paragraph: what user-observable capability does this feature add or change, on
which clients (web first; mobile, desktop, extensions stated)?

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** [precondition], **when** [action], **then** [observable outcome].

### 2.2 Edge cases & failures

- **Given** [unusual precondition], **when** [action], **then** [graceful behaviour].

## 3. Functional Requirements

- **FR-1** The app MUST [behaviour].
- **FR-2** The app SHOULD [behaviour].
- **FR-3** The app MUST NOT [forbidden behaviour].

## 4. Non-Functional Requirements

- **Performance**: [e.g. "first paint of the page under 1 s on a warm cache"]
- **Reliability**: [e.g. "live updates resume after a reconnect without a reload"]
- **Security & privacy**: what is shown to whom; what leaves the platform API
- **Accessibility**: keyboard operation, labels, contrast in both themes
- **Compatibility**: locales, mobile/desktop/extension parity

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `[Name]`         | …           |

## 6. Out of Scope

- …

## 7. Acceptance Criteria

- [ ] [Observable outcome 1]
- [ ] [Failure / unhappy-path outcome]
- [ ] Every new string present in every locale file
- [ ] Behind the runtime flag; nothing changes while it is off
- [ ] All functional requirements have a passing test

## 8. Open Questions

- `[NEEDS CLARIFICATION: …]`

## 9. Constitution Gates

- [ ] I Platform API is the backend
- [ ] II Layered web app
- [ ] III Every string translated
- [ ] IV Runtime config; default-off flag; nothing removed
- [ ] V One design system
- [ ] VI Security and privacy
- [ ] VII Real-time through the platform channel
- [ ] VIII Multi-client parity stated
- [ ] IX Tests and gates
- [ ] X Behaviour-first (this document)
- [ ] XI Documentation describes our product only

## 10. References

- Platform spec(s): …
- Related features / ADRs / architecture: …
