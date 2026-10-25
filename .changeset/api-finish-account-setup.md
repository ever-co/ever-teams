---
'@ever-teams/api': minor
---

Export `finishAccountSetup(loginResult, tenantName)`: finishes the Teams setup of a signed-in account whose setup stopped before its tenant (tenant, default organization + team, employee, refreshed token) and answers an account with a tenant as is. `createCompleteAccount` now runs it after the sign-up, unchanged in behaviour.
