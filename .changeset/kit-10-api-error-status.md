---
'@ever-teams/api': patch
---

An error answer keeps its HTTP status (`statusCode`) when its body is empty or not JSON (a gateway's HTML 503 page, a 401 with no body), and a JSON error body without one gets it (with the status text as `message` and `error` when it has neither), so a caller can tell an answer from a request that got none. Such an answer used to make the request fail while its body was read, and the request functions returned it with no status.
