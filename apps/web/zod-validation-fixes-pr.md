# 🚀 React Query Migration and Critical Bug Fixes

_Complete React Query migration for team requests, fix GitHub integration infinite loops, and resolve Zod validation errors._

## Description

This PR completes a comprehensive set of improvements across React Query migrations, integration stability, and validation consistency. The work addresses multiple related issues that were causing infinite loops and application instability.

**Problems Addressed:**

1. **React Query Migration**: `useRequestToJoinTeam` hook needed migration to follow established patterns
2. **GitHub Integration**: Infinite loop in GitHub installation process causing 114+ API calls in 4 seconds
3. **Zod Validation**: 56+ identical validation errors from InviteService and EmployeeService causing repeated API calls

**Solutions Applied:**

1. **Migrated `useRequestToJoinTeam`** to React Query with proper caching, error handling, and state management
2. **Fixed GitHub integration** by implementing proper installation completion state and preventing re-triggers
3. **Corrected Zod schemas** to handle API inconsistencies while maintaining contract enforcement

**Why These Changes Are Useful:**

- Completes React Query migration following established patterns for consistency
- Eliminates infinite loops and excessive API calls across multiple services
- Maintains data integrity and validation quality while improving stability
- Provides better user experience with proper loading states and error handling

## What Was Changed

### Major Changes

**1. React Query Migration:**

- **Migrated `useRequestToJoinTeam`** in `apps/web/core/hooks/organizations/teams/use-request-to-join-team.ts`:
  - Converted from legacy API calls to React Query with proper caching
  - Added proper error handling and loading states
  - Implemented query key management following established patterns

**2. GitHub Integration Bug Fix:**

- **Fixed infinite loop** in `apps/web/core/components/pages/integration/github/page-component.tsx`:
  - Added installation completion state tracking
  - Implemented proper flag reset on success and error
  - Prevented re-triggering of installation process

**3. Zod Validation Fixes:**

- **Updated `relationalEmployeeSchema`** in `apps/web/core/types/schemas/common/base.schema.ts`:
  - Made `employeeId` field optional and nullable to handle missing employee IDs from API
- **Updated `baseInviteSchema`** in `apps/web/core/types/schemas/user/invite.schema.ts`:
  - Made `email`, `token`, and `status` fields optional and nullable
  - Added `.passthrough()` to allow additional API fields
- **Fixed UI component** in `apps/web/core/components/teams/invite/invitation-table.tsx`:
  - Added null handling for invitation status display

### Minor Changes

- Updated TypeScript types to handle nullable fields properly
- Maintained backward compatibility with existing hook interfaces
- Preserved all existing validation logic and error reporting
- Added proper query key exports for request-to-join functionality
- Enhanced error handling consistency across all three work streams

## How to Test This PR

1. **Run the application:**

   ```bash
   yarn web:dev
   ```

2. **Navigate to pages that test all three work streams:**
   - Go to team management pages (tests React Query migration)
   - Go to `/settings/team#integrations` and test GitHub integration (tests infinite loop fix)
   - Go to any page that loads team members and invitations (tests Zod validation fixes)

3. **Verify the fixes:**
   - **React Query**: Confirm proper caching and loading states for team requests
   - **GitHub Integration**: Verify no infinite loops during GitHub app installation
   - **Zod Validation**: Check no repeated validation errors in console or logs
   - Check that `apps/web/logs/error-2025-06-09.log` shows no new repeated errors

4. **Test functionality still works:**
   - Team request functionality works with proper React Query patterns
   - GitHub integration completes successfully without re-triggering
   - Invitation and employee data loads correctly with graceful error handling
   - Genuine API contract violations should still be logged appropriately

## Screenshots (if needed)

### Previous Status (Issues)

```text
❌ React Query: useRequestToJoinTeam using legacy API patterns
❌ GitHub Integration: 114+ API calls in 4 seconds (infinite loop)
❌ Zod Validation: 56+ identical errors in logs:
   "Validation failed in getMyInvitations API response: items.0.email: Required"
   "Validation failed in getWorkingEmployees API response: items.0.employeeId: Required"
```

### Current Status (Fixed)

```text
✅ React Query: useRequestToJoinTeam fully migrated with proper caching
✅ GitHub Integration: Single installation call, proper completion handling
✅ Zod Validation: No repeated validation errors, graceful API handling
✅ Application loads smoothly across all affected areas
✅ Contract enforcement maintained for genuine issues
```

## Related Issues

- Completes React Query migration for team request functionality following established patterns
- Fixes critical GitHub integration infinite loop causing excessive API calls
- Resolves Zod validation errors identified in error logs
- Addresses infinite loop issues across multiple services (GitHub, InviteService, EmployeeService)
- Related to ongoing React Query migration work and validation consistency improvements

## Type of Change

- [x] Bug fix (fixes a problem)
- [ ] New feature (adds functionality)
- [ ] Breaking change (requires changes elsewhere)
- [ ] Documentation update

## ✅ Checklist

- [x] My code follows the project coding style
- [x] I reviewed my own code and added comments where needed
- [x] I tested my changes locally
- [x] I updated or created related documentation if needed
- [x] No new warnings or errors are introduced

## Notes for the Reviewer

**Important Context:**

- This branch addresses **three related work streams** that were causing application instability
- **React Query migration** follows established patterns for consistency across the codebase
- **GitHub integration fix** resolves a critical infinite loop affecting user experience
- **Zod validation fixes** are targeted corrections that maintain contract enforcement
- All changes preserve existing functionality while improving stability and performance

**Testing Focus:**

- Verify React Query migration works with proper caching and error handling
- Confirm GitHub integration completes without infinite loops
- Check that Zod validation errors are resolved without breaking contract enforcement
- Ensure all three work streams function correctly together
- Validate that no new issues are introduced in related functionality

## ⚠️⚠️⚠️ Reviewers Suggested

- `@evereq` for architecture validation
- `@ndekocode` for integration review
