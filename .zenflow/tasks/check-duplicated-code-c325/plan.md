# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 2679e77f-1e21-49f5-8523-304863a525b5 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

**Status**: ✅ Complete - Created comprehensive PRD in `.zenflow/tasks/check-duplicated-code-c325/requirements.md`

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

**Status**: ✅ Complete - Created comprehensive technical specification in `.zenflow/tasks/check-duplicated-code-c325/spec.md`
- Defined 3-phase approach: Simple → Moderate → Complex refactorings
- Documented 6 refactoring techniques with examples
- Established verification approach (yarn lint, typecheck)
- Defined commit strategy (one per iteration, small PRs)
- Created placement guidelines for refactored code

### [x] Step: Planning
<!-- chat-id: 6d4d5ca9-f38c-483d-b7bf-8d021061c4ee -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

**Status**: ✅ Complete - Created detailed implementation plan with 10 refactoring iterations across 3 phases

---

## Implementation Plan

This section replaces the generic "Implementation" step with specific refactoring tasks organized by complexity (simple → moderate → complex).

### **PHASE 1: Simple Utility Refactorings** (Low Risk, High Value)

#### [ ] Iteration 1: Duplicated String/User Formatting Functions

**Objective**: Find and refactor duplicated user name, text, or string formatting utilities.

**Approach**:
1. Search for patterns like `${firstName} ${lastName}`, `user.name`, text truncation, capitalization
2. Read 3-5 candidate files with similar patterns
3. Extract to `apps/web/core/lib/utils/string-utils.ts` or `user-utils.ts`
4. Replace all usage sites (use TypeScript to find references)

**Expected Outcomes**:
- New utility file created with 2-4 functions
- 3-10 usage sites refactored
- Reduced code duplication by ~30-50 lines

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] All imports resolve correctly

**Commit**: `refactor(utils): extract duplicated string/user formatting functions`

---

#### [ ] Iteration 2: Duplicated Array/Object Manipulation Helpers

**Objective**: Find and refactor duplicated array filtering, mapping, sorting, or object transformation logic.

**Approach**:
1. Search for patterns like `.filter()`, `.map()`, `.reduce()`, `Object.keys()`, `Object.entries()`
2. Identify repeated transformation patterns (e.g., `filter by status`, `group by property`)
3. Extract to `apps/web/core/lib/utils/array-utils.ts` or `object-utils.ts`
4. Use TypeScript generics for type safety

**Expected Outcomes**:
- Generic utility functions (e.g., `filterByProperty`, `groupBy`, `sortByProperty`)
- 5-15 usage sites refactored
- More consistent data transformation patterns

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] Generic types work correctly

**Commit**: `refactor(utils): extract duplicated array/object manipulation helpers`

---

#### [ ] Iteration 3: Duplicated Date/Time Utilities

**Objective**: Find and refactor duplicated date formatting, parsing, or calculation logic.

**Approach**:
1. Search for patterns like `new Date()`, `toISOString()`, `toLocaleDateString()`, date arithmetic
2. Look for repeated date formatting patterns
3. Extract to `apps/web/core/lib/utils/date-utils.ts`
4. Consider using existing date utilities if available

**Expected Outcomes**:
- Centralized date utilities (e.g., `formatDate`, `parseDate`, `addDays`)
- 3-8 usage sites refactored
- Consistent date handling across app

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] Date formats are consistent

**Commit**: `refactor(utils): extract duplicated date/time utilities`

---

### **PHASE 2: Moderate Pattern Refactorings** (Medium Risk, Medium Value)

#### [ ] Iteration 4: Repeated API Service Patterns

**Objective**: Find and refactor repeated API call patterns in service layer.

**Approach**:
1. Search `apps/web/core/services/` for repeated try-catch patterns, error handling
2. Look for similar GET/POST/PUT/DELETE implementations
3. Extract to `apps/web/core/services/client/api-helpers.ts`
4. Create generic `fetchData<T>()`, `postData<T>()` helpers if justified

**Expected Outcomes**:
- Generic API helpers (if pattern appears 3+ times)
- 5-12 service methods refactored
- Centralized error handling

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] API calls still work correctly

**Commit**: `refactor(services): extract repeated API service patterns`

---

#### [ ] Iteration 5: Similar Custom Hook Patterns

**Objective**: Find and refactor repeated React hook patterns.

**Approach**:
1. Search `apps/web/core/hooks/` for repeated `useState` + `useCallback` patterns
2. Look for toggle state, loading state, form state patterns
3. Extract to `apps/web/core/hooks/common/` (e.g., `use-toggle.ts`, `use-loading.ts`)
4. Ensure proper dependency arrays

**Expected Outcomes**:
- 1-3 new common hooks created
- 5-15 components refactored
- More consistent hook usage

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] Hooks follow React rules

**Commit**: `refactor(hooks): extract similar custom hook patterns`

---

#### [ ] Iteration 6: Repeated Form Validation Patterns

**Objective**: Find and refactor repeated Zod schema patterns or validation logic.

**Approach**:
1. Search `apps/web/core/types/schemas/` for similar validation rules
2. Look for repeated patterns (email, password, required fields)
3. Extract to reusable schema compositions or validators
4. Consider creating schema utilities if pattern is strong

**Expected Outcomes**:
- Reusable validation schemas or utilities
- 3-8 schemas refactored
- More consistent validation

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] Zod validation still works

**Commit**: `refactor(validation): extract repeated form validation patterns`

---

### **PHASE 3: Strategic Refactorings** (Higher Risk, Strategic Value)

#### [ ] Iteration 7: Generic Component Abstractions

**Objective**: Find and refactor similar UI components with minor variations.

**Approach**:
1. Search `apps/web/core/components/` for similar card, list, or modal components
2. Identify components with shared structure but different data
3. Create generic components with TypeScript generics
4. Place in `apps/web/core/components/common/`

**Expected Outcomes**:
- 1-2 generic components created (e.g., `EntityCard<T>`, `DataList<T>`)
- 3-6 specific components refactored or replaced
- More consistent UI patterns

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] UI renders correctly
- [ ] Consider `yarn build:web` for UI changes

**Commit**: `refactor(components): create generic component abstractions`

---

#### [ ] Iteration 8: Service Layer Abstractions

**Objective**: Create base service classes or factory functions for repeated service patterns.

**Approach**:
1. Analyze `apps/web/core/services/` for common CRUD patterns
2. Determine if base class or factory function is appropriate
3. Extract shared logic (error handling, auth, caching)
4. Refactor 2-4 services to use the abstraction

**Expected Outcomes**:
- Base service class or factory function
- 2-4 services refactored
- More maintainable service layer

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] API integration still works
- [ ] `yarn build:web` passes

**Commit**: `refactor(services): create service layer abstractions`

---

#### [ ] Iteration 9: Complex Hook Compositions

**Objective**: Compose complex hooks from simpler, reusable hooks.

**Approach**:
1. Identify hooks with similar patterns but different domains
2. Break down into smaller, composable hooks
3. Compose domain-specific hooks from generic ones
4. Improve hook reusability

**Expected Outcomes**:
- 2-3 generic hooks extracted
- 1-2 complex hooks refactored to use composition
- Better hook architecture

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] React hook rules respected
- [ ] No hook dependency issues

**Commit**: `refactor(hooks): compose complex hooks from reusable primitives`

---

#### [ ] Iteration 10: Cross-Cutting Concerns (Error Handling, Logging)

**Objective**: Extract repeated cross-cutting concern patterns (error handling, logging, analytics).

**Approach**:
1. Search for repeated error handling patterns (try-catch, error messages)
2. Look for repeated logging or console.error calls
3. Extract to centralized utilities (e.g., `error-handler.ts`, `logger.ts`)
4. Consider creating error boundary patterns

**Expected Outcomes**:
- Centralized error handling utility
- Consistent error messages
- 5-15 usage sites refactored

**Verification**:
- [ ] `yarn lint` passes
- [ ] TypeScript shows no errors
- [ ] Error handling still works correctly
- [ ] `yarn build:web` passes

**Commit**: `refactor(core): extract cross-cutting concerns (error handling, logging)`

---

## Progress Tracking

### Summary
- **Total Iterations**: 10
- **Completed**: 0
- **In Progress**: 0
- **Remaining**: 10

### Metrics (to be updated per iteration)
- Duplicated blocks identified: 0
- Duplicated blocks refactored: 0
- Lines of code reduced: 0
- New utilities/hooks created: 0

### Notes
- Each iteration is independent and can be completed in sequence
- Mark iterations complete by changing `[ ]` to `[x]`
- Update metrics after each iteration
- Commit after each successful refactoring
- If an iteration finds no meaningful duplication, document and skip

---

## Next Steps

1. Start with **Iteration 1: Duplicated String/User Formatting Functions**
2. Follow the workflow: Identify → Analyze → Design → Implement → Verify → Commit
3. Update this plan with progress and metrics
4. Continue until 5-10 meaningful refactorings completed or no more high-value duplications found
