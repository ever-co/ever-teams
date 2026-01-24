# Technical Specification
# Code Duplication Review and Refactoring

**Version**: 1.0  
**Date**: January 24, 2026  
**Based on**: `requirements.md`

---

## 1. Technical Context

### 1.1 Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| **Framework** | Next.js (App Router) | 16 | SSR, RSC, API routes |
| **Language** | TypeScript | 5.9+ | Strict mode enabled |
| **State (Global)** | Jotai | 2.15+ | Atomic state management |
| **State (Server)** | TanStack Query | 5.90+ | Data fetching/caching |
| **Validation** | Zod | 3.25+ | Runtime type validation |
| **HTTP Client** | Axios | Latest | Custom wrapper in APIService |
| **Build System** | Turbo + Nx | Latest | Monorepo orchestration |
| **Package Manager** | Yarn 1.x | 1.x | Workspaces enabled |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS |

### 1.2 Codebase Structure

```
apps/web/core/
├── components/        # React components (~150+ files)
│   ├── auth/
│   ├── common/        # Shared UI components
│   ├── features/      # Feature-specific components
│   ├── layouts/
│   ├── pages/
│   ├── tasks/
│   ├── teams/
│   └── ...
├── hooks/             # Custom React hooks (~159 hooks)
│   ├── tasks/
│   ├── teams/
│   ├── users/
│   ├── common/
│   └── ...
├── services/          # API service layer (~121 services)
│   ├── client/
│   │   ├── api/
│   │   │   ├── tasks/
│   │   │   ├── teams/
│   │   │   ├── users/
│   │   │   └── ...
│   │   └── axios.ts
│   └── server/
├── lib/               # Utilities and helpers
│   ├── utils/         # Utility functions
│   ├── helpers/
│   ├── auth/
│   └── validation/
├── stores/            # Jotai atoms
├── types/             # TypeScript types and schemas
│   ├── schemas/       # Zod validation schemas
│   └── interfaces/
└── constants/         # Constants and configuration

packages/              # Shared packages (cross-app)
├── ui/                # Shared UI components
├── services/          # Shared API services
├── hooks/             # Shared React hooks
├── types/             # Shared TypeScript types
├── utils/             # Shared utilities
└── constants/         # Shared constants
```

### 1.3 Key Patterns in Codebase

#### Pattern 1: Custom Hooks with TanStack Query
```typescript
// apps/web/core/hooks/tasks/use-task-status.ts
export function useTaskStatus() {
  const queryClient = useQueryClient();
  
  // Query for fetching
  const taskStatusesQuery = useQuery({
    queryKey: queryKeys.taskStatuses.byTeam(teamId),
    queryFn: () => taskStatusService.getTaskStatuses(),
    enabled: Boolean(organizationId && teamId && tenantId)
  });
  
  // Mutation for updating
  const updateMutation = useMutation({
    mutationFn: (data) => taskStatusService.editTaskStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.taskStatuses.byTeam(teamId)
      });
    }
  });
  
  return {
    taskStatuses: taskStatusesQuery.data?.items,
    loading: taskStatusesQuery.isLoading,
    updateTaskStatus: updateMutation.mutateAsync
  };
}
```

#### Pattern 2: API Service Classes
```typescript
// apps/web/core/services/client/api.service.ts
export class APIService {
  protected readonly baseURL: string | undefined;
  public readonly axiosInstance: AxiosInstance;
  
  // Common HTTP methods
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  protected async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  protected async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
}
```

#### Pattern 3: Utility Functions
```typescript
// apps/web/core/lib/utils/remove-duplicate-item.ts
export const removeDuplicateItems = <TItem extends { id: string }>(items?: TItem[]): TItem[] => {
  const seenIds = new Set<string>();
  return items?.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  }) ?? [];
};
```

---

## 2. Implementation Approach

### 2.1 Progression Strategy: Simple → Complex

Based on user requirements, we'll progress from **simple** to **complex** refactorings:

#### **Phase 1: Simple Refactorings** (Low Risk, High Value)
1. **Duplicated utility functions** - Exact duplicates across files
2. **Simple data transformations** - Format functions, parsers
3. **Constants and configuration values** - Hard-coded values
4. **Simple validation patterns** - Repeated Zod schemas

#### **Phase 2: Moderate Refactorings** (Medium Risk, Medium Value)
5. **Repeated API call patterns** - Similar service methods
6. **Similar component props/logic** - Repeated component patterns
7. **Form handling patterns** - Repeated form validation logic
8. **State management patterns** - Similar hooks with slight variations

#### **Phase 3: Complex Refactorings** (Higher Risk, Strategic Value)
9. **Generic component abstractions** - Generalize similar components
10. **Service layer abstractions** - Base classes or factory functions
11. **Hook composition** - Compose complex hooks from simpler ones
12. **Cross-cutting concerns** - Error handling, logging, analytics

### 2.2 Incremental Approach

Each refactoring iteration follows this workflow:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IDENTIFY                                                 │
│    - Search for duplication using Grep/Glob                 │
│    - Analyze 2-3 candidate instances                        │
│    - Choose the most impactful one                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ANALYZE                                                  │
│    - Read all files containing the duplication              │
│    - Understand context and usage                           │
│    - Determine if refactoring is justified                  │
│    - Plan the abstraction approach                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. DESIGN                                                   │
│    - Choose refactoring technique (extract, generalize)     │
│    - Determine placement (utils, hooks, packages)           │
│    - Design function/component signature                    │
│    - Consider backward compatibility                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. IMPLEMENT                                                │
│    - Create the abstraction (function/hook/component)       │
│    - Add TypeScript types                                   │
│    - Add JSDoc comments                                     │
│    - Export from appropriate index file                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. REFACTOR USAGE SITES                                     │
│    - Import the new abstraction                             │
│    - Replace duplicated code                                │
│    - Remove old implementations                             │
│    - Update all instances (use TypeScript to find them)     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. VERIFY                                                   │
│    - Run `yarn lint` - MUST pass                            │
│    - Check TypeScript errors - MUST be 0                    │
│    - For significant changes: `yarn build:web`              │
│    - Manual functional check if needed                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. COMMIT                                                   │
│    - Write clear commit message (Conventional Commits)      │
│    - Commit (one commit per refactoring iteration)          │
│    - Update plan.md progress                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. ITERATE                                                  │
│    - Proceed to next duplication                            │
│    - OR conclude if sufficient progress made                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Refactoring Techniques & Patterns

### 3.1 Extract Utility Function

**When to use**: 
- Identical or nearly identical code blocks (3+ lines)
- Repeated logic in 2+ places
- Pure functions without side effects

**Example**:

**Before** (duplicated across 3 files):
```typescript
// File A
function getUserFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// File B
function getFullName(user: User): string {
  return `${user.firstName} ${user.lastName}`;
}

// File C
const fullName = `${user.firstName} ${user.lastName}`;
```

**After**:
```typescript
// apps/web/core/lib/utils/user-utils.ts
/**
 * Formats a user's full name from first and last name.
 * @param user - User object with firstName and lastName
 * @returns Formatted full name
 */
export function formatUserFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

// File A, B, C (usage)
import { formatUserFullName } from '@/core/lib/utils/user-utils';
const fullName = formatUserFullName(user);
```

**Placement**: `apps/web/core/lib/utils/` → organized by domain (`user-utils.ts`, `task-utils.ts`, etc.)

---

### 3.2 Generalize Function with Generics

**When to use**:
- Similar logic applied to different types
- Pattern repeated across multiple entity types
- Can be made type-safe with TypeScript generics

**Example**:

**Before**:
```typescript
// Repeated pattern across multiple files
const activeUsers = users.filter(u => u.status === 'active');
const activeTasks = tasks.filter(t => t.status === 'active');
const activeProjects = projects.filter(p => p.status === 'active');
```

**After**:
```typescript
// apps/web/core/lib/utils/filter-utils.ts
/**
 * Filters items by a specific status.
 * @param items - Array of items with a status property
 * @param status - Status value to filter by
 * @returns Filtered array
 */
export function filterByStatus<T extends { status: string }>(
  items: T[],
  status: string
): T[] {
  return items.filter(item => item.status === status);
}

// Or more generic
export function filterByProperty<T, K extends keyof T>(
  items: T[],
  key: K,
  value: T[K]
): T[] {
  return items.filter(item => item[key] === value);
}

// Usage
const activeUsers = filterByStatus(users, 'active');
const activeTasks = filterByStatus(tasks, 'active');
const completedProjects = filterByStatus(projects, 'completed');
```

---

### 3.3 Extract Custom Hook

**When to use**:
- Repeated React patterns (useState, useEffect, useCallback combinations)
- Similar data fetching logic
- Repeated state management patterns

**Example**:

**Before** (repeated across 5+ components):
```typescript
// Component A
const [isOpen, setIsOpen] = useState(false);
const toggle = useCallback(() => setIsOpen(prev => !prev), []);
const open = useCallback(() => setIsOpen(true), []);
const close = useCallback(() => setIsOpen(false), []);

// Component B
const [visible, setVisible] = useState(false);
const toggleVisible = useCallback(() => setVisible(prev => !prev), []);
const show = useCallback(() => setVisible(true), []);
const hide = useCallback(() => setVisible(false), []);
```

**After**:
```typescript
// apps/web/core/hooks/common/use-toggle.ts
/**
 * Hook for managing boolean toggle state.
 * @param initialValue - Initial state value (default: false)
 * @returns State and control functions
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(prev => !prev), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue
  } as const;
}

// Usage in components
const modal = useToggle();
// modal.value, modal.toggle(), modal.setTrue(), modal.setFalse()

const dropdown = useToggle(false);
```

**Placement**: 
- `apps/web/core/hooks/common/` for generic hooks
- `apps/web/core/hooks/{domain}/` for domain-specific hooks

---

### 3.4 Compose with Higher-Order Functions

**When to use**:
- Repeated transformation chains
- Common data processing pipelines
- Reusable function composition

**Example**:

**Before**:
```typescript
// Repeated across multiple files
const processedUsers = users
  .filter(u => u.isActive)
  .map(u => ({ ...u, fullName: `${u.firstName} ${u.lastName}` }))
  .sort((a, b) => a.fullName.localeCompare(b.fullName));

const processedTasks = tasks
  .filter(t => t.status === 'active')
  .map(t => ({ ...t, formattedDate: formatDate(t.createdAt) }))
  .sort((a, b) => b.createdAt - a.createdAt);
```

**After**:
```typescript
// apps/web/core/lib/utils/array-utils.ts
/**
 * Composes array transformations (filter, map, sort).
 */
export function composeTransformations<T, R = T>(
  items: T[],
  operations: {
    filter?: (item: T) => boolean;
    map?: (item: T) => R;
    sort?: (a: R, b: R) => number;
  }
): R[] {
  let result: any[] = items;
  
  if (operations.filter) {
    result = result.filter(operations.filter);
  }
  if (operations.map) {
    result = result.map(operations.map);
  }
  if (operations.sort) {
    result = result.sort(operations.sort);
  }
  
  return result;
}

// Usage
const processedUsers = composeTransformations(users, {
  filter: u => u.isActive,
  map: u => ({ ...u, fullName: formatUserFullName(u) }),
  sort: (a, b) => a.fullName.localeCompare(b.fullName)
});
```

---

### 3.5 Extract Service Abstraction

**When to use**:
- Repeated API call patterns
- Similar error handling across services
- Common request/response transformations

**Example**:

**Before** (repeated across 10+ service methods):
```typescript
// Repeated pattern
async function fetchUsers() {
  try {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

async function fetchTasks() {
  try {
    const { data } = await apiClient.get<Task[]>('/tasks');
    return data;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    throw error;
  }
}
```

**After**:
```typescript
// apps/web/core/services/client/api-helpers.ts
/**
 * Generic GET request with error handling.
 * @param endpoint - API endpoint
 * @param errorMessage - Custom error message
 * @returns Response data
 */
export async function fetchData<T>(
  endpoint: string,
  errorMessage?: string
): Promise<T> {
  try {
    const { data } = await apiClient.get<T>(endpoint);
    return data;
  } catch (error) {
    const message = errorMessage || `Failed to fetch data from ${endpoint}`;
    console.error(message, error);
    throw error;
  }
}

// Usage
const fetchUsers = () => fetchData<User[]>('/users', 'Failed to fetch users');
const fetchTasks = () => fetchData<Task[]>('/tasks', 'Failed to fetch tasks');
```

**Note**: Only create abstractions when pattern appears 3+ times.

---

### 3.6 Generalize Component

**When to use**:
- Similar UI components with minor variations
- Repeated component structure
- Can use TypeScript generics for type safety

**Example**:

**Before**:
```typescript
// UserCard.tsx
<Card>
  <Avatar src={user.avatar} />
  <h3>{user.name}</h3>
  <p>{user.email}</p>
</Card>

// TeamCard.tsx
<Card>
  <Avatar src={team.logo} />
  <h3>{team.name}</h3>
  <p>{team.description}</p>
</Card>
```

**After**:
```typescript
// apps/web/core/components/common/entity-card.tsx
interface EntityCardProps<T> {
  data: T;
  avatar: string;
  title: string;
  subtitle: string;
  className?: string;
}

export function EntityCard<T>({ 
  data, 
  avatar, 
  title, 
  subtitle,
  className 
}: EntityCardProps<T>) {
  return (
    <Card className={className}>
      <Avatar src={avatar} />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </Card>
  );
}

// Usage
<EntityCard 
  data={user} 
  avatar={user.avatar} 
  title={user.name} 
  subtitle={user.email} 
/>

<EntityCard 
  data={team} 
  avatar={team.logo} 
  title={team.name} 
  subtitle={team.description} 
/>
```

**Placement**: `apps/web/core/components/common/` for shared UI components

---

## 4. Code Organization & Placement

### 4.1 Placement Decision Matrix

| Code Type | Scope | Primary Location | Alternative Location |
|-----------|-------|------------------|---------------------|
| **Utility Functions** | Web app only | `apps/web/core/lib/utils/` | N/A |
| **Utility Functions** | Cross-app (web + mobile) | `packages/utils/` | Keep duplicated if complex |
| **React Hooks** | Web app only | `apps/web/core/hooks/` | N/A |
| **React Hooks** | Cross-app | `packages/hooks/` | Keep duplicated if complex |
| **UI Components** | Web app only | `apps/web/core/components/common/` | N/A |
| **UI Components** | Cross-app | `packages/ui/` | Keep duplicated (RN vs React) |
| **API Services** | Web app only | `apps/web/core/services/client/` | N/A |
| **API Services** | Cross-app | `packages/services/` | If shared API client |
| **Types/Interfaces** | Web app only | `apps/web/core/types/` | N/A |
| **Types/Interfaces** | Cross-app | `packages/types/` | Preferred |
| **Constants** | Web app only | `apps/web/core/constants/` | N/A |
| **Constants** | Cross-app | `packages/constants/` | Preferred |
| **Zod Schemas** | Web app only | `apps/web/core/types/schemas/` | N/A |
| **Zod Schemas** | Cross-app | `packages/types/schemas/` | If shared validation |

### 4.2 File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Utility functions | `{domain}-utils.ts` | `user-utils.ts`, `date-utils.ts` |
| React hooks | `use-{name}.ts` | `use-toggle.ts`, `use-fetch-data.ts` |
| Components | `{name}.tsx` (PascalCase) | `EntityCard.tsx`, `Modal.tsx` |
| Services | `{name}.service.ts` | `user.service.ts`, `task.service.ts` |
| Types | `{name}.types.ts` | `user.types.ts`, `api.types.ts` |
| Schemas | `{name}.schema.ts` | `user.schema.ts`, `task.schema.ts` |

### 4.3 Export Strategy

**Always export from index files** for clean imports:

```typescript
// apps/web/core/lib/utils/index.ts
export * from './user-utils';
export * from './date-utils';
export * from './array-utils';
export * from './string-utils';

// Usage
import { formatUserFullName, formatDate } from '@/core/lib/utils';
```

---

## 5. Verification Approach

### 5.1 Verification Commands

After each refactoring iteration, run these commands:

#### **Required** (Must Pass)
```bash
# 1. ESLint check
yarn lint

# 2. TypeScript type check (via IDE or explicit)
# - Monitor TypeScript errors in IDE
# - OR run: npx tsc --noEmit
```

#### **For Significant Changes** (Recommended)
```bash
# 3. Production build verification
yarn build:web
```

#### **Manual Verification** (When Applicable)
- Review changed files visually
- Test affected functionality manually if possible
- Verify imports resolve correctly

### 5.2 Success Criteria Per Iteration

Each refactoring iteration must meet these criteria:

- ✅ **TypeScript compiles** - Zero type errors
- ✅ **Lint passes** - `yarn lint` exits with code 0
- ✅ **Functionality preserved** - No behavior changes
- ✅ **Imports resolve** - No broken imports
- ✅ **Code is cleaner** - Subjectively assessed (less duplication)
- ✅ **Well-documented** - JSDoc comments added where appropriate

### 5.3 Rollback Plan

If verification fails:
1. **Identify the issue** - Read error messages carefully
2. **Fix immediately** - Make corrections
3. **Re-verify** - Run verification commands again
4. **If stuck** - Revert changes and document the blocker

---

## 6. Delivery Phases

Based on user requirements (simple → complex), we'll organize work into phases:

### **Phase 1: Simple Utility Refactorings** (Iterations 1-3)
**Target**: Low-hanging fruit with high impact

- **Iteration 1**: Duplicated string/number formatting functions
- **Iteration 2**: Duplicated array/object manipulation helpers
- **Iteration 3**: Duplicated date/time utilities

**Characteristics**:
- Pure functions (no side effects)
- Easy to extract and test
- Low risk of breaking changes

---

### **Phase 2: Moderate Pattern Refactorings** (Iterations 4-6)
**Target**: Repeated patterns across the codebase

- **Iteration 4**: Repeated API service patterns
- **Iteration 5**: Similar custom hook patterns
- **Iteration 6**: Repeated form validation patterns

**Characteristics**:
- Involves React patterns (hooks, effects)
- Requires careful dependency management
- Medium risk, but TypeScript helps

---

### **Phase 3: Strategic Refactorings** (Iterations 7-10)
**Target**: High-value architectural improvements

- **Iteration 7**: Generic component abstractions
- **Iteration 8**: Service layer abstractions
- **Iteration 9**: Complex hook compositions
- **Iteration 10**: Cross-cutting concerns (error handling, logging)

**Characteristics**:
- Requires deeper architectural changes
- Higher complexity, but strategic value
- More planning required per iteration

---

## 7. Commit Strategy

Per user requirements: **One commit per refactoring iteration.**

### 7.1 Commit Message Format

Follow **Conventional Commits** specification:

```
refactor(<scope>): <short description>

<optional body with details>

- What was duplicated
- Where it was located
- How it was refactored
- Any breaking changes (if applicable)
```

### 7.2 Commit Message Examples

**Example 1: Simple Utility**
```
refactor(utils): extract duplicated user name formatting function

Extracted formatUserFullName utility that was duplicated across:
- apps/web/core/components/teams/team-member-card.tsx
- apps/web/core/components/users/user-profile.tsx
- apps/web/core/hooks/users/use-user-details.ts

Moved to: apps/web/core/lib/utils/user-utils.ts
```

**Example 2: Custom Hook**
```
refactor(hooks): extract common toggle state hook

Created useToggle hook to replace repeated toggle state patterns across 8 components.

Replaced:
- Duplicated useState + useCallback patterns
- Inconsistent toggle function names

Moved to: apps/web/core/hooks/common/use-toggle.ts
```

**Example 3: Service Pattern**
```
refactor(services): create fetchData helper for API calls

Extracted common GET request pattern that was repeated across 12 service methods.

Improvements:
- Centralized error handling
- Type-safe generic implementation
- Reduced code duplication by ~100 lines

Moved to: apps/web/core/services/client/api-helpers.ts
```

### 7.3 Small PR Strategy

Each commit should result in a **small, focused PR**:
- ✅ **Single concern**: One refactoring per PR
- ✅ **Easy to review**: Reviewer can understand changes quickly
- ✅ **Low risk**: Easy to revert if needed
- ✅ **Clear benefit**: Obvious improvement in code quality

---

## 8. Risk Mitigation

### 8.1 Identified Risks & Mitigations

| Risk | Mitigation Strategy |
|------|---------------------|
| **Breaking existing functionality** | Leverage TypeScript compiler; run `yarn lint` after each change |
| **Over-abstraction** | Only abstract when pattern appears 3+ times; keep abstractions simple |
| **Merge conflicts** | Work incrementally; small PRs reduce conflict surface area |
| **Incomplete refactoring** | Use TypeScript "Find All References" to locate all usage sites |
| **Performance regression** | Avoid unnecessary abstractions; profile if concerned |
| **Hard-to-understand abstractions** | Add clear JSDoc comments; follow naming conventions |

### 8.2 Safety Measures

1. **TypeScript as Safety Net**: Rely on TypeScript compiler to catch breaking changes
2. **Incremental Changes**: Never refactor multiple patterns in one go
3. **Verification After Each Step**: Run lint/typecheck immediately
4. **Clear Documentation**: Add JSDoc comments to all new abstractions
5. **Rollback Ready**: Each commit is isolated and can be reverted independently

---

## 9. Tools & Commands Reference

### 9.1 Search for Duplication

```bash
# Search for specific patterns (using Grep tool)
# Example: Find all occurrences of "filter(u => u.status"
Grep pattern="filter\(.*status" path="apps/web/core" output_mode="content"

# Find all utility files
Glob pattern="apps/web/core/lib/utils/**/*.ts"

# Find all custom hooks
Glob pattern="apps/web/core/hooks/**/*.ts"
```

### 9.2 Verification Commands

```bash
# Lint check (must pass)
yarn lint

# Lint fix (auto-fix issues)
yarn lint-fix

# Format code
yarn format

# Build web app (for significant changes)
yarn build:web

# TypeScript check (explicit, optional)
npx tsc --noEmit
```

### 9.3 Build Shared Packages (if modified)

```bash
# If moving code to packages/utils
yarn build:utils

# If moving code to packages/hooks
yarn build:hooks

# If moving code to packages/types
yarn build:types
```

---

## 10. Examples of Target Duplications

### 10.1 Phase 1: Simple Utilities (High Priority)

#### Example 1: String Formatting
**Search**: `Grep pattern="\.trim\(\).*\.toLowerCase\(\)" path="apps/web/core"`

Likely finding: Multiple occurrences of trimming and lowercase conversion

**Refactor to**: `apps/web/core/lib/utils/string-utils.ts`
```typescript
export function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}
```

#### Example 2: Array De-duplication
**Search**: `Grep pattern="filter.*\.id.*includes" path="apps/web/core"`

Likely finding: Manual de-duplication logic

**Refactor to**: Enhance `apps/web/core/lib/utils/remove-duplicate-item.ts`
```typescript
// Already exists, but may need variants:
export function uniqueBy<T, K extends keyof T>(items: T[], key: K): T[] {
  const seen = new Set();
  return items.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}
```

#### Example 3: Date Formatting
**Search**: `Grep pattern="toLocaleDateString" path="apps/web/core"`

Likely finding: Repeated date formatting patterns

**Refactor to**: `apps/web/core/lib/utils/date-utils.ts`
```typescript
export function formatDate(date: Date | string, locale = 'en-US'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
```

### 10.2 Phase 2: Moderate Patterns (Medium Priority)

#### Example 4: API Error Handling
**Search**: `Grep pattern="catch.*console\.error" path="apps/web/core/services"`

Likely finding: Repeated try-catch patterns in service methods

**Refactor to**: `apps/web/core/services/client/api-helpers.ts`
```typescript
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(errorMessage || 'Operation failed', error);
    throw error;
  }
}
```

#### Example 5: useQuery Patterns
**Search**: `Grep pattern="useQuery.*queryKey.*queryFn" path="apps/web/core/hooks"`

Likely finding: Similar useQuery patterns across hooks

**Refactor to**: `apps/web/core/hooks/common/use-fetch.ts`
```typescript
export function useFetch<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled = true
) {
  return useQuery({
    queryKey,
    queryFn,
    enabled
  });
}
```

### 10.3 Phase 3: Strategic Refactorings (Lower Priority, High Value)

#### Example 6: Generic List Component
**Search**: Manually review similar list components

Likely finding: Multiple list components with similar structure

**Refactor to**: `apps/web/core/components/common/generic-list.tsx`
```typescript
interface GenericListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

export function GenericList<T>({ 
  items, 
  renderItem, 
  keyExtractor,
  emptyMessage = 'No items found'
}: GenericListProps<T>) {
  if (items.length === 0) {
    return <p>{emptyMessage}</p>;
  }
  
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
```

---

## 11. Decision Log

Key technical decisions made during specification:

| Decision | Rationale |
|----------|-----------|
| **Focus on web app only** | Per user requirements; mobile/desktop in future iterations |
| **Simple → Complex progression** | Per user requirements; reduces risk, builds confidence |
| **One commit per iteration** | Per user requirements; enables small PRs, easier review |
| **TypeScript + Lint as verification** | Pragmatic given limited test infrastructure |
| **Prefer web app location** | Only move to packages if truly cross-app AND simple |
| **JSDoc comments required** | Improves discoverability and maintainability |
| **No over-abstraction** | Only abstract when pattern appears 3+ times |

---

## 12. Success Metrics

### 12.1 Quantitative Metrics (Per Iteration)

- **Instances refactored**: How many duplicate code blocks removed
- **Lines of code reduced**: Net reduction in codebase size
- **Files affected**: Number of files modified
- **New abstractions created**: Functions/hooks/components created

### 12.2 Qualitative Metrics (Overall)

- **Code readability**: Subjectively assessed by reviewer
- **Maintainability**: Easier to modify common logic
- **Consistency**: More uniform code patterns
- **Developer experience**: Faster to find and use utilities

### 12.3 Target Goals

- ✅ **5-10 meaningful refactorings** completed
- ✅ **Zero lint/type errors** after each iteration
- ✅ **Measurable code reduction** (aim for 200+ lines reduced)
- ✅ **Improved code organization** (clearer structure)

---

## 13. Next Steps

After approval of this specification:

1. **Create Implementation Plan** (`plan.md`)
   - Break down into concrete tasks (10-15 specific refactoring iterations)
   - Prioritize based on simple → complex
   - Assign specific duplication targets to each iteration

2. **Begin Phase 1 Execution**
   - Start with simplest utility function duplications
   - Follow the incremental workflow
   - Commit after each iteration

3. **Track Progress**
   - Update `plan.md` after each iteration
   - Document blockers or challenges
   - Adjust strategy if needed

---

## Appendix A: Code Style Guidelines

### A.1 TypeScript Style

```typescript
// ✅ Good: Explicit return types
export function formatUserFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

// ❌ Bad: Implicit return type
export function formatUserFullName(user) {
  return `${user.firstName} ${user.lastName}`.trim();
}
```

### A.2 JSDoc Comments

```typescript
/**
 * Formats a user's full name from first and last name.
 * 
 * @param user - User object with firstName and lastName properties
 * @returns Formatted full name string
 * 
 * @example
 * ```ts
 * formatUserFullName({ firstName: 'John', lastName: 'Doe' })
 * // Returns: "John Doe"
 * ```
 */
export function formatUserFullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`.trim();
}
```

### A.3 Function Naming

- **Verbs for actions**: `formatDate`, `filterByStatus`, `validateEmail`
- **Nouns for getters**: `getUserFullName`, `getActiveItems`
- **Boolean predicates**: `isValidEmail`, `hasPermission`, `canEdit`

---

**Document Status**: ✅ Complete and ready for Implementation Planning phase
