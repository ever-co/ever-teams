---
'@ever-teams/atoms': patch
---

The kit's notices (a blocked window, an unreachable server, an API error, a sign-in refusal, the client report's failure) are drawn on the kit's own background with their tint laid over it, instead of a tint over transparency, so they stay readable in the dark scheme on a light host page. In the dark scheme their action ("Try again", "Sign in again") takes the kit's light purple, which reads at more than 4.5:1 on the dark surface. The light scheme looks as before.
