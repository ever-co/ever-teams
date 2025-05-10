# 🚀 Pull Request Title

_A short and clear title that describes what this PR does._

Example:
> Add Retry, Cache, and Logging Features to API Service

## Description

Please describe **what you did**, and **why**.

- What problem or feature does this PR address?
- What changes were made?
- Why are these changes useful?

Example:
> This PR adds advanced features to the API request system:
>
> - Retry failed requests with exponential delay
> - Cache GET responses with TTL
> - Log all requests and responses
> - Allow cancelling requests
>
> These features improve reliability, performance, and debugging.

## What Was Changed

### Major Changes

Example:
> Here are the major changes in that his PR adds
>
> - New `CookieManagement` class for cookie handling
> - Cancel requests using `AbortController`
> - Automatically inject tenant and organization headers

### Minor Changes

Example:
> Here are the minor changes in that his PR adds
>
> - Update `tast-status`  component style
> - Work on the theme toggler
> - Remove unused imports

## How to Test This PR

Please explain clearly how to test the changes locally:

Example:
>
> 1. Run the app with `yarn web:dev`
> 2. Open the browser at `http://localhost:3030`
> 3. Try navigating to a page that uses API calls (e.g., `/tasks`)
> 4. Check:
   >
   > - Logs in the console
   > - Retry works on failed requests
   > - Cache works on repeated GET requests
   > - Errors are handled properly
   > - Cancelling navigation cancels requests
   > - Remove unused imports

> If this PR affects UI:
>
> - Include before and after screenshots
> - Explain any design or UX changes

## Screenshots (if needed)

| Before           | After            |
| ---------------- | ---------------- |
| (Add screenshot) | (Add screenshot) |

> You can also add videos or logs here.

### Previous screenshots

Please add here videos or images of the previous status

### Current screenshots

Please add here videos or images of the current (new) status

## Related Issues

Please list related issues, tasks or discussions:

Example:
>
> - Closes #1234
> - Related to #5678

## Type of Change

- [ ] Bug fix (fixes a problem)
- [ ] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

Please confirm you did the following before asking for review:

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced

## Notes for the Reviewer (Optional)

_Add here any context, help, or known issues for the person reviewing:_

- Example: “The retry logic uses `setTimeout` for now – may need refinement.”
- Example: “PostHog is disabled in dev, enable it in `.env` to test logs.”

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@ndekocode` for integration review
- `@Innocent-Akim` for auth and cookie handling and assistance
- `@AnicetFantomas` and `@Sergemuhundu` for mobile app and some web issues
- `@Cedric921` and `@GloireMutaliko21` for complex issues
