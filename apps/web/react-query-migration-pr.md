# 🚀 Migrate usePublicOrganizationTeams Hook to React Query with Zod Validation

_Migrates the public organization teams hook from useQueryCall to React Query while preserving backward compatibility and adding performance optimizations._

## Description

Please describe **what you did**, and **why**.

- What problem or feature does this PR address?
- What changes were made?
- Why are these changes useful?

> This PR migrates the `usePublicOrganizationTeams` hook to React Query as part of our progressive React Query adoption strategy:
>
> - Replaces `useQueryCall` with native `useQuery` hooks
> - Adds Zod validation schemas for type safety
> - Implements intelligent caching with configurable stale times
> - Centralizes query keys for better organization
> - Prevents infinite loops and unnecessary re-renders
> - Maintains 100% backward compatibility with existing components
>
> These changes improve performance through caching, enhance type safety with Zod validation, and prepare the codebase for modern React Query patterns while ensuring zero breaking changes.

## What Was Changed

### Major Changes

> Here are the major changes that this PR adds:
>
> - **New Zod Schemas**: Created comprehensive validation schemas in `apps/web/core/types/schemas/`
>   - `common/data-response.schema.ts` - Common API response validation
>   - `team/public-organization-team.schema.ts` - Public team data validation
> - **Service Migration**: Updated `publicOrganizationTeamService` with Zod validation
>   - Added `validateApiResponse` utility for all API responses
>   - Enhanced error handling with `ZodValidationError`
> - **React Query Integration**: Migrated `usePublicOrganizationTeams` hook
>   - Replaced `useQueryCall` with `useQuery` hooks
>   - Added intelligent caching (5min for team data, 15min for misc data)
>   - Implemented anti-infinite loop optimizations
> - **Centralized Query Keys**: Added organized keys under `queryKeys.teams.public`

### Minor Changes

> Here are the minor changes that this PR adds:
>
> - Updated schema exports in `apps/web/core/types/schemas/index.ts`
> - Added TypeScript type inference from Zod schemas
> - Enhanced JSDoc documentation for critical functions
> - Optimized import statements and removed unused dependencies

## How to Test This PR

Please explain clearly how to test the changes locally:

> 1. Run the app with `yarn web:dev`
> 2. Open the browser at `http://localhost:3030`
> 3. Navigate to a public team page: `/team/[teamId]/[profileLink]`
> 4. Check the following functionality:
>    - Team data loads correctly on first visit
>    - Subsequent visits use cached data (check Network tab)
>    - Loading states work properly
>    - 404 handling works for invalid team links
>    - Task data and misc data (statuses, priorities, etc.) load correctly
>    - No infinite loops or excessive API calls
> 5. Test TypeScript compilation: `npx tsc --noEmit --skipLibCheck`
> 6. Verify no console errors or warnings
> 7. Test with different team profiles to ensure caching works per team

> **Performance Testing:**
> - Open DevTools Network tab
> - Navigate to a team page multiple times within 5 minutes
> - Verify API calls are cached and not repeated
> - Check that loading states are handled correctly

## Screenshots (if needed)

| Before           | After            |
| ---------------- | ---------------- |
| useQueryCall implementation | React Query with caching |
| Manual loading state management | Automatic React Query loading states |

> **Network Tab Comparison:**
> - Before: Multiple API calls for same data
> - After: Cached responses, fewer network requests

### Previous screenshots

> Previous implementation used `useQueryCall` with manual state management and no caching, resulting in repeated API calls for the same data.

### Current screenshots

> New implementation uses React Query with intelligent caching, Zod validation, and optimized loading states.

## Related Issues

Please list related issues, tasks or discussions:

> - Part of progressive React Query migration strategy
> - Follows established patterns from migrated hooks like `useTeamInvitations`
> - Addresses performance concerns with repeated API calls
> - Enhances type safety across the application

## Type of Change

- [ ] Bug fix (fixes a problem)
- [x] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

Please confirm you did the following before asking for review:

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced
- [x] TypeScript compilation passes without errors
- [x] Backward compatibility is maintained
- [x] Performance optimizations are implemented
- [x] Zod validation is properly integrated

## Notes for the Reviewer (Optional)

_Add here any context, help, or known issues for the person reviewing:_

- **Migration Strategy**: This follows our established React Query migration pattern used in other hooks
- **Backward Compatibility**: The hook interface remains 100% identical to prevent breaking changes
- **Performance**: Caching is configured with 5-minute stale time for team data and 15-minute for misc data
- **Anti-Infinite Loop**: Implemented robust checks to prevent setState loops and unnecessary re-renders
- **Zod Integration**: All API responses are now validated, enhancing type safety and error handling
- **Query Keys**: Organized under `teams.public` namespace for consistency with existing patterns

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation and React Query patterns
- `@ndekocode` for integration review and performance validation
- `@Innocent-Akim` for testing and compatibility verification
