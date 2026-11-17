---
'@ever-teams/atoms': minor
---

The timers and the sign-in forms say what went wrong, inside the widget instead of a red toast on the host page: "This site isn't allowed to show Ever Teams", "Your session ended" (with a "Sign in again" action), "You don't have permission to track time in this workspace" or "Ever Teams is unreachable", in English and French. A request that gets no answer is told apart with a no-cors request to the API (at most 5 seconds): the site is not allowed when the API answers, Ever Teams is unreachable when it does not. Going offline shows the unreachable message at once, and the next successful read clears it; a page that loaded while Ever Teams was unreachable reads the user again once the browser is back online or the page regains focus. A wrong password or a refused token keeps the form's own message, and any other refusal keeps the API's text.
