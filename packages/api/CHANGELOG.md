# @ever-teams/api

## 0.2.0

### Minor Changes

- a878d88: Export `finishAccountSetup(loginResult, tenantName)`: finishes the Teams setup of a signed-in account whose setup stopped before its tenant (tenant, default organization + team, employee, refreshed token) and answers an account with a tenant as is. `createCompleteAccount` now runs it after the sign-up, unchanged in behaviour.

## 0.1.9

### Patch Changes

- 410458f: Refactored SDK request structure

## 0.1.8

### Patch Changes

- Tracking Package First version and integration in other packages
- Updated dependencies
    - @ever-teams/types@0.1.10

## 0.1.7

### Patch Changes

- Introduced team management
- Updated dependencies
    - @ever-teams/types@0.1.9

## 0.1.6

### Patch Changes

- Refac Teams Sign Components, Add language support with i18n.
- Updated dependencies
    - @ever-teams/types@0.1.8
