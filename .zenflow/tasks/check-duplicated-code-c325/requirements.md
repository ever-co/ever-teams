# Product Requirements Document (PRD)
# Code Duplication Review and Refactoring

**Version**: 1.0  
**Date**: January 24, 2026  
**Author**: Zencoder AI  

---

## 1. Executive Summary

This document defines the requirements for a comprehensive code duplication review and refactoring effort across the Ever Teams monorepo. The goal is to identify duplicated code patterns, logic, and utilities across the codebase and systematically refactor them to improve maintainability, reduce technical debt, and enhance code reusability.

---

## 2. Background & Context

### 2.1 Project Overview
Ever Teams is an open-source work and project management platform built as a monorepo with:
- **Web Application** (Next.js 16 with App Router) - Primary focus
- **Mobile Application** (React Native + Expo)
- **Desktop Application** (Electron)
- **Browser Extension** (Plasmo Framework)
- **Shared Packages** (UI, Services, Hooks, Types, Utils, Constants)

### 2.2 Current State
The codebase has grown organically with:
- **400+ TypeScript/TSX files** in `apps/web/core` alone
- **~159 custom React hooks** across the application
- **~121 API service functions** in the service layer
- Multiple feature areas (auth, tasks, teams, users, timer, projects, etc.)
- Shared packages for cross-application code reuse

### 2.3 Problem Statement
As the codebase has evolved, code duplication has naturally occurred through:
- **Copy-paste development** - Similar components/functions duplicated across features
- **Pattern repetition** - Similar logic implemented differently in various places
- **Incomplete abstractions** - Utility functions that should be shared but aren't
- **Component duplication** - Similar UI components with minor variations
- **Service layer duplication** - Similar API call patterns across services
- **Hook duplication** - Similar state management patterns across custom hooks

This duplication leads to:
- Increased maintenance burden (changes must be made in multiple places)
- Higher risk of bugs and inconsistencies
- Larger bundle sizes
- Harder onboarding for new developers
- Violation of DRY (Don't Repeat Yourself) principles

---

## 3. Goals & Objectives

### 3.1 Primary Goals
1. **Identify Code Duplication**: Systematically find duplicated code patterns across the codebase
2. **Reduce Technical Debt**: Refactor duplicated code into reusable abstractions
3. **Improve Maintainability**: Make the codebase easier to understand and modify
4. **Establish Patterns**: Create clear patterns for common operations

### 3.2 Success Metrics
- **Qualitative**:
  - Fewer instances of near-identical code blocks
  - More consistent API service patterns
  - Clearer separation of concerns
  - Better code organization
  
- **Quantitative** (tracked per iteration):
  - Number of duplicated code blocks identified
  - Number of duplicated blocks successfully refactored
  - Lines of code reduced (net change)
  - Number of new utility functions/hooks created

### 3.3 Non-Goals
This effort will NOT:
- Rewrite working functionality for the sake of rewriting
- Change the external API or user-facing behavior
- Introduce breaking changes to shared packages without careful consideration
- Over-engineer or prematurely abstract unique implementations
- Refactor code that is truly context-specific and should remain separate

---

## 4. Scope Definition

### 4.1 In-Scope Areas

#### Primary Focus (Web Application)
1. **`apps/web/core/components/`** - React components
   - Common UI patterns (forms, modals, dropdowns, cards)
   - Layout components
   - Feature-specific components with shared patterns

2. **`apps/web/core/hooks/`** - Custom React hooks (~159 hooks)
   - State management patterns
   - Data fetching patterns
   - Form handling patterns
   - Timer/tracking logic

3. **`apps/web/core/services/`** - API service layer (~121 services)
   - HTTP request patterns
   - Error handling
   - Response transformation
   - Authentication/authorization patterns

4. **`apps/web/core/lib/utils/`** - Utility functions
   - Data transformation
   - Formatting functions (dates, numbers, strings)
   - Validation helpers
   - Array/object manipulation

5. **`apps/web/core/types/schemas/`** - Zod validation schemas
   - Common validation patterns
   - Schema composition
   - Type inference patterns

#### Secondary Focus (Shared Packages)
6. **`packages/utils/`** - Cross-application utilities
7. **`packages/hooks/`** - Shared React hooks
8. **`packages/services/`** - Shared API clients

### 4.2 Out-of-Scope (Current Phase)
- Mobile app (`apps/mobile`) - May address in future iterations
- Desktop app (`apps/server-web`) - May address in future iterations
- Browser extension (`apps/extensions`) - May address in future iterations
- Build scripts and tooling configuration
- Third-party library code
- Auto-generated code (if any)

---

## 5. Duplication Identification Criteria

### 5.1 Types of Duplication to Identify

#### 5.1.1 Exact Duplication
- **Identical code blocks** (3+ lines) appearing in multiple files
- Same function implementations with identical logic
- Copy-pasted utility functions

**Example**:
```typescript
// Found in multiple files
function formatUserName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}
```

#### 5.1.2 Structural Duplication
- **Similar structure** with minor variations (variable names, constants)
- Same algorithm implemented differently
- Similar control flow patterns

**Example**:
```typescript
// File A
const activeUsers = users.filter(u => u.status === 'active');

// File B  
const activeTasks = tasks.filter(t => t.status === 'active');

// Could be generalized:
const filterByStatus = <T extends { status: string }>(items: T[], status: string) => 
  items.filter(item => item.status === status);
```

#### 5.1.3 Pattern Duplication
- **Repeated patterns** across multiple files
- Common data transformation sequences
- Similar component composition patterns
- Repeated API call patterns

**Example**:
```typescript
// Pattern repeated across services
async function fetchData() {
  try {
    const response = await api.get('/endpoint');
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

#### 5.1.4 Component Duplication
- Similar React components with minor UI differences
- Repeated component composition patterns
- Similar prop handling logic

**Example**:
```typescript
// TaskCard.tsx
<Card>
  <CardHeader>{task.title}</CardHeader>
  <CardContent>{task.description}</CardContent>
</Card>

// ProjectCard.tsx
<Card>
  <CardHeader>{project.name}</CardHeader>
  <CardContent>{project.description}</CardContent>
</Card>

// Could use generic ItemCard<T> component
```

### 5.2 Duplication Thresholds
To avoid false positives and focus on meaningful duplication:

- **Minimum code block size**: 3+ lines (excluding imports, types, whitespace)
- **Minimum similarity**: 80%+ similarity (accounting for variable names)
- **Minimum occurrences**: 2+ instances (3+ for high-priority refactoring)
- **Contextual relevance**: Consider if duplication is intentional/justified

### 5.3 Acceptable Duplication (Not to Refactor)
Some duplication is acceptable when:
- **Business logic varies**: Code looks similar but has different business rules
- **Context-specific**: Implementation is tied to specific context that shouldn't be abstracted
- **One-time use**: Code appears similar but is unlikely to be reused
- **Performance critical**: Abstraction would introduce unacceptable overhead
- **Maintainability tradeoff**: Abstraction would make code harder to understand

---

## 6. Refactoring Strategy

### 6.1 Iterative Approach
To manage risk and ensure quality, refactoring will be done iteratively:

1. **Identify**: Find one instance of duplication
2. **Analyze**: Understand the context and usage
3. **Design**: Plan the refactoring approach
4. **Implement**: Create abstractions and refactor usage sites
5. **Test**: Verify functionality is preserved
6. **Verify**: Run lint and type checks
7. **Document**: Update comments/documentation as needed
8. **Review**: Confirm improvement before moving to next iteration

### 6.2 Refactoring Techniques

#### 6.2.1 Extract Function/Utility
- Pull duplicated logic into standalone utility function
- Place in appropriate location (`lib/utils/`, `packages/utils/`)
- Export and reuse across files

#### 6.2.2 Extract Custom Hook
- Pull duplicated React patterns into custom hook
- Place in `core/hooks/` or `packages/hooks/`
- Ensure proper dependency management

#### 6.2.3 Generalize Component
- Create generic version of duplicated components
- Use TypeScript generics for type safety
- Support variants through props

#### 6.2.4 Create Service Abstraction
- Extract common API patterns into base service class/functions
- Centralize error handling
- Standardize response transformation

#### 6.2.5 Compose with Higher-Order Functions
- Use HOCs or render props for shared behavior
- Wrap components with common functionality

### 6.3 Code Organization Principles
When refactoring, follow these principles:

1. **Principle of Least Surprise**: Abstractions should be intuitive
2. **Single Responsibility**: Each function/component has one clear purpose
3. **Dependency Inversion**: Depend on abstractions, not concrete implementations
4. **Appropriate Abstraction Level**: Don't over-engineer or under-engineer
5. **Existing Patterns**: Follow established patterns in the codebase

### 6.4 Placement Guidelines
Where to place refactored code:

| Code Type | Primary Location | Alternative Location |
|-----------|------------------|---------------------|
| Utility Functions | `apps/web/core/lib/utils/` | `packages/utils/` (if cross-app) |
| React Hooks | `apps/web/core/hooks/` | `packages/hooks/` (if cross-app) |
| UI Components | `apps/web/core/components/common/` | `packages/ui/` (if cross-app) |
| API Services | `apps/web/core/services/` | `packages/services/` (if cross-app) |
| Type Utilities | `apps/web/core/types/` | `packages/types/` (if cross-app) |
| Constants | `apps/web/core/constants/` | `packages/constants/` (if cross-app) |

---

## 7. Risk Management

### 7.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Breaking existing functionality | Medium | High | Thorough testing after each refactor; verify with lint/typecheck |
| Over-abstraction | Medium | Medium | Only abstract when pattern appears 3+ times; keep abstractions simple |
| Merge conflicts | Low | Medium | Work incrementally; communicate changes clearly |
| Performance regression | Low | Medium | Avoid unnecessary abstractions; profile if concerned |
| Incomplete refactoring | Medium | Low | Track all usage sites; use TypeScript compiler to find references |

### 7.2 Safety Measures
1. **Type Safety**: Leverage TypeScript to catch errors at compile time
2. **Lint Checks**: Run `yarn lint` after each refactoring iteration
3. **Build Verification**: Run `yarn build:web` for significant changes
4. **Incremental Changes**: Refactor one duplication at a time
5. **Code Review**: Review changes before marking complete
6. **Rollback Plan**: Each change is isolated and can be reverted independently

---

## 8. Verification & Quality Assurance

### 8.1 Per-Iteration Verification
After each refactoring iteration:

1. **TypeScript Compiler**: Verify no type errors
2. **ESLint**: Run `yarn lint` - must pass
3. **Manual Review**: Verify code quality and readability
4. **Functional Check**: Verify behavior is preserved (manual or automated tests if available)

### 8.2 Quality Criteria
Refactored code must meet these criteria:
- ✅ **Type-safe**: No TypeScript errors
- ✅ **Lint-clean**: Passes ESLint checks
- ✅ **Well-documented**: Clear function/component names and JSDoc comments where appropriate
- ✅ **Consistent style**: Follows existing code conventions (Prettier formatting)
- ✅ **Backward compatible**: Doesn't break existing usage
- ✅ **Testable**: Can be tested independently (where applicable)
- ✅ **Performant**: No significant performance degradation

---

## 9. Implementation Workflow

### 9.1 Standard Workflow (Per Iteration)
```
1. Search/Identify duplication
   ↓
2. Read relevant files to understand context
   ↓
3. Analyze whether refactoring is justified
   ↓
4. Design refactoring approach
   ↓
5. Implement refactoring (extract, generalize, etc.)
   ↓
6. Update all usage sites
   ↓
7. Run verification (lint, typecheck, build)
   ↓
8. Document changes (comments, commit message)
   ↓
9. Mark iteration complete in plan
   ↓
10. Proceed to next iteration OR conclude work
```

### 9.2 Tools & Techniques
- **grep/Grep tool**: Search for duplicated patterns
- **Glob tool**: Find files matching patterns
- **Read tool**: Review file contents for context
- **Edit tool**: Make surgical code changes
- **Bash tool**: Run verification commands

---

## 10. Success Criteria

### 10.1 Definition of Done (Overall Task)
The task is considered complete when:
- ✅ At least **5-10 meaningful duplication instances** have been identified and refactored
- ✅ All refactorings pass **lint and type checks**
- ✅ Code is **more maintainable** (subjectively assessed)
- ✅ Technical debt has been **measurably reduced**
- ✅ All changes are **documented** in commit messages

### 10.2 Definition of Done (Per Iteration)
Each iteration is complete when:
- ✅ Duplication identified and analyzed
- ✅ Refactoring implemented successfully
- ✅ All usage sites updated
- ✅ Verification passed (`yarn lint`, typecheck)
- ✅ Changes committed with clear message
- ✅ Progress updated in `plan.md`

---

## 11. Constraints & Assumptions

### 11.1 Constraints
- **No breaking changes**: External APIs and user-facing behavior must remain unchanged
- **Preserve functionality**: All existing functionality must work after refactoring
- **Follow conventions**: Must follow existing code style and patterns
- **No new dependencies**: Avoid adding new npm packages unless absolutely necessary
- **Backward compatibility**: Shared packages must remain compatible with existing usage

### 11.2 Assumptions
- ✅ The codebase has sufficient test coverage OR manual verification is acceptable
- ✅ `yarn lint` and `yarn build:web` are sufficient for verification
- ✅ Incremental refactoring is preferred over large-scale rewrites
- ✅ TypeScript compiler will catch most breaking changes
- ✅ The team values code quality and maintainability

---

## 12. Open Questions & Clarifications

### 12.1 Questions for User (if needed)
The following may require clarification during implementation:

1. **Priority Areas**: Are there specific areas of the codebase that are higher priority for refactoring?
2. **Shared Package Changes**: If duplication spans apps, should we promote code to shared packages?
3. **Test Coverage**: Are there automated tests we should run, or is `yarn lint` + manual verification sufficient?
4. **Commit Strategy**: Should each refactoring be a separate commit, or can we batch related changes?

### 12.2 Decision Log
Key decisions made during requirements gathering:

| Decision | Rationale |
|----------|-----------|
| Focus on web app first | Web app is the primary application with most code |
| Iterative approach (one at a time) | Reduces risk; allows for continuous verification |
| Use existing verification tools | Pragmatic given test infrastructure limitations |
| Document in commit messages | Standard practice; no separate documentation needed |
| Leverage TypeScript for safety | TypeScript compiler catches most refactoring issues |

---

## 13. Next Steps

After approval of this PRD, proceed to:

1. **Technical Specification** (`spec.md`): Define implementation approach, code patterns, and refactoring techniques
2. **Implementation Plan** (`plan.md`): Break down work into concrete, actionable tasks
3. **Execution**: Implement refactorings iteratively
4. **Verification**: Ensure quality at each step
5. **Documentation**: Update plan.md and commit messages

---

## Appendix A: Example Duplication Patterns

### Example 1: Duplicated Utility Function
```typescript
// Found in 3+ files
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Refactor: Move to apps/web/core/lib/utils/string-utils.ts
```

### Example 2: Repeated API Call Pattern
```typescript
// Pattern repeated across services
try {
  const { data } = await apiClient.get<User[]>('/users');
  return data;
} catch (error) {
  console.error('Failed to fetch users:', error);
  throw error;
}

// Refactor: Create generic fetchData<T>(endpoint: string) helper
```

### Example 3: Similar Components
```typescript
// UserCard.tsx
<Card>
  <Avatar src={user.avatar} />
  <h3>{user.name}</h3>
  <p>{user.email}</p>
</Card>

// TeamMemberCard.tsx
<Card>
  <Avatar src={member.avatar} />
  <h3>{member.name}</h3>
  <p>{member.role}</p>
</Card>

// Refactor: Generic ItemCard<T> component with render props
```

---

**Document Status**: ✅ Complete and ready for Technical Specification phase
