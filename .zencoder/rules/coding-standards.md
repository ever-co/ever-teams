---
description: Coding Standards and Best Practices
alwaysApply: true
---

# Ever Teams – Coding Standards and Best Practices

Detailed coding standards for maintaining consistency and quality across the Ever Teams codebase.

---

## Table of Contents

1. [TypeScript Standards](#typescript-standards)
2. [React Component Patterns](#react-component-patterns)
3. [State Management](#state-management)
4. [API & Service Layer](#api--service-layer)
5. [Form Handling](#form-handling)
6. [Styling & CSS](#styling--css)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Security Best Practices](#security-best-practices)
10. [Testing Patterns](#testing-patterns)

---

## TypeScript Standards

### Type Definitions

**Prefer interfaces for object shapes**:
```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid for object shapes
type User = {
  id: string;
  name: string;
  email: string;
};
```

**Use types for unions, intersections, and utility types**:
```typescript
// ✅ Good
type Status = 'pending' | 'active' | 'completed';
type UserWithRole = User & { role: Role };
type PartialUser = Partial<User>;
```

### Type Safety

**Avoid `any`** – Use `unknown` or proper types:
```typescript
// ❌ Bad
function processData(data: any) {
  return data.value;
}

// ✅ Good
function processData(data: unknown) {
  if (isValidData(data)) {
    return data.value;
  }
  throw new Error('Invalid data');
}

// ✅ Better
function processData(data: DataType) {
  return data.value;
}
```

**Use type guards**:
```typescript
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}
```

### Generics

**Use meaningful generic names**:
```typescript
// ❌ Bad
function mapItems<T, U>(items: T[], fn: (item: T) => U): U[] {
  return items.map(fn);
}

// ✅ Good
function mapItems<TInput, TOutput>(
  items: TInput[],
  transform: (item: TInput) => TOutput
): TOutput[] {
  return items.map(transform);
}
```

### Enums vs Union Types

**Prefer union types over enums** (smaller bundle size):
```typescript
// ✅ Preferred
type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';

// ⚠️ Use only when you need reverse mapping
enum TaskPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Critical = 3
}
```

---

## React Component Patterns

### Component Structure

**Standard component template**:
```typescript
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@ever-teams/ui';
import { useTaskData } from '@/core/hooks/useTaskData';
import type { Task } from '@/core/types';

interface TaskCardProps {
  task: Task;
  onUpdate?: (task: Task) => void;
  className?: string;
}

export function TaskCard({ task, onUpdate, className }: TaskCardProps) {
  const t = useTranslations('tasks');
  const [isEditing, setIsEditing] = useState(false);
  const { updateTask } = useTaskData();

  const handleSave = async () => {
    await updateTask(task);
    onUpdate?.(task);
    setIsEditing(false);
  };

  return (
    <div className={className}>
      {/* Component JSX */}
    </div>
  );
}
```

### Props Patterns

**Destructure props in function signature**:
```typescript
// ✅ Good
export function UserProfile({ user, onEdit }: UserProfileProps) {
  // ...
}

// ❌ Avoid
export function UserProfile(props: UserProfileProps) {
  const { user, onEdit } = props;
  // ...
}
```

**Use optional props with `?`**:
```typescript
interface ComponentProps {
  required: string;
  optional?: number;
  callback?: () => void;
}
```

**Use default values in destructuring**:
```typescript
export function Pagination({ page = 1, size = 10, onPageChange }: PaginationProps) {
  // ...
}
```

### Component Composition

**Break down large components**:
```typescript
// ❌ Bad - Single large component (300+ lines)
export function TaskManagement() {
  // Massive component with all logic
}

// ✅ Good - Composed from smaller components
export function TaskManagement() {
  return (
    <div>
      <TaskFilters />
      <TaskList />
      <TaskPagination />
    </div>
  );
}
```

### Conditional Rendering

**Use explicit conditions**:
```typescript
// ✅ Good
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataTable data={data} />}

// ⚠️ Be careful with numbers/strings
{items.length > 0 && <ItemList items={items} />}  // ✅ Explicit
{items.length && <ItemList items={items} />}      // ❌ Renders "0"
```

---

## State Management

### Local State (useState)

**Use for UI-only state**:
```typescript
// ✅ Good - UI state
const [isOpen, setIsOpen] = useState(false);
const [activeTab, setActiveTab] = useState('overview');

// ❌ Bad - Server data (use TanStack Query instead)
const [users, setUsers] = useState<User[]>([]);
```

### Global State (Jotai)

**Create atoms in `core/stores/`**:
```typescript
// core/stores/auth.ts
import { atom } from 'jotai';
import type { User } from '@/core/types';

export const currentUserAtom = atom<User | null>(null);
export const isAuthenticatedAtom = atom((get) => get(currentUserAtom) !== null);
```

**Use atoms in components**:
```typescript
import { useAtom, useAtomValue } from 'jotai';
import { currentUserAtom, isAuthenticatedAtom } from '@/core/stores/auth';

export function UserMenu() {
  const [user, setUser] = useAtom(currentUserAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  
  // ...
}
```

### Server State (TanStack Query)

**Define queries in custom hooks**:
```typescript
// core/hooks/useTaskData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '@/core/services/task.service';

export function useTaskData(taskId: string) {
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskService.getTask(taskId)
  });

  const updateMutation = useMutation({
    mutationFn: taskService.updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    }
  });

  return {
    task,
    isLoading,
    updateTask: updateMutation.mutate
  };
}
```

---

## API & Service Layer

### Service Structure

**Organize services by domain**:
```
core/services/
├── client/
│   ├── auth.service.ts
│   ├── task.service.ts
│   └── team.service.ts
└── server/
    ├── user.service.ts
    └── organization.service.ts
```

### Service Implementation

**Standard service pattern**:
```typescript
// core/services/client/task.service.ts
import { apiClient } from '@ever-teams/services';
import type { Task, CreateTaskDto, UpdateTaskDto } from '@/core/types';

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const { data } = await apiClient.get<Task[]>('/tasks');
    return data;
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await apiClient.get<Task>(`/tasks/${id}`);
    return data;
  },

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const { data } = await apiClient.post<Task>('/tasks', dto);
    return data;
  },

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const { data } = await apiClient.patch<Task>(`/tasks/${id}`, dto);
    return data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  }
};
```

### API Error Handling

**Use consistent error handling**:
```typescript
import { AxiosError } from 'axios';

export async function handleApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { error: error.response?.data?.message || error.message };
    }
    return { error: 'An unexpected error occurred' };
  }
}
```

---

## Form Handling

### React Hook Form + Zod

**Define schema in `core/types/schemas/`**:
```typescript
// core/types/schemas/task.schema.ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid()
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
```

**Use in component**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, type CreateTaskFormData } from '@/core/types/schemas/task.schema';

export function CreateTaskForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema)
  });

  const onSubmit = async (data: CreateTaskFormData) => {
    await taskService.createTask(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        Create Task
      </button>
    </form>
  );
}
```

---

## Styling & CSS

### Tailwind CSS Usage

**Use Tailwind utility classes**:
```tsx
// ✅ Good
<div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
  <Avatar src={user.avatar} />
  <span className="text-sm font-medium text-gray-900">{user.name}</span>
</div>
```

**Extract repeated patterns to components**:
```tsx
// ❌ Bad - Repeated classes everywhere
<button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
  Submit
</button>

// ✅ Good - Component abstraction
import { Button } from '@ever-teams/ui';
<Button variant="primary">Submit</Button>
```

### Class Composition

**Use `clsx` or `cn` for conditional classes**:
```typescript
import { clsx } from 'clsx';

<div className={clsx(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  className  // Allow prop override
)} />
```

### Responsive Design

**Mobile-first approach**:
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Stacks on mobile, 2-col on tablet, 3-col on desktop */}
</div>
```

---

## Error Handling

### Error Boundaries

**Wrap components with error boundaries**:
```typescript
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => window.location.reload()}
>
  <YourComponent />
</ErrorBoundary>
```

### Async Error Handling

**Use try-catch with user feedback**:
```typescript
import { toast } from 'sonner';

async function handleDelete(id: string) {
  try {
    await taskService.deleteTask(id);
    toast.success('Task deleted successfully');
  } catch (error) {
    console.error('Failed to delete task:', error);
    toast.error('Failed to delete task. Please try again.');
  }
}
```

---

## Performance Optimization

### Memoization

**Use `useMemo` for expensive computations**:
```typescript
const sortedTasks = useMemo(() => {
  return tasks.sort((a, b) => b.priority - a.priority);
}, [tasks]);
```

**Use `useCallback` for callback props**:
```typescript
const handleTaskUpdate = useCallback((task: Task) => {
  updateTask(task);
}, [updateTask]);

<TaskCard task={task} onUpdate={handleTaskUpdate} />
```

**Use `React.memo` selectively**:
```typescript
export const TaskCard = React.memo(function TaskCard({ task }: TaskCardProps) {
  // Component that re-renders only when task changes
}, (prevProps, nextProps) => {
  return prevProps.task.id === nextProps.task.id;
});
```

### Code Splitting

**Use dynamic imports for large components**:
```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false
});
```

---

## Security Best Practices

### XSS Prevention

**Never use `dangerouslySetInnerHTML` unless absolutely necessary**:
```tsx
// ❌ Dangerous
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe - React escapes by default
<div>{userInput}</div>

// ✅ If you must render HTML, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### Authentication

**Check auth status before rendering sensitive data**:
```typescript
import { useAtomValue } from 'jotai';
import { isAuthenticatedAtom } from '@/core/stores/auth';

export function ProtectedComponent() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <SensitiveData />;
}
```

### API Security

**Never expose secrets in client code**:
```typescript
// ❌ Bad
const API_KEY = 'sk-1234567890';

// ✅ Good - Use environment variables
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// ✅ Better - Keep secrets server-side only
// Use API routes to proxy requests with secrets
```

---

## Testing Patterns

### Component Testing

**Test user interactions, not implementation details**:
```typescript
// ✅ Good - Test behavior
it('should submit form when user clicks submit', async () => {
  render(<CreateTaskForm />);
  
  await userEvent.type(screen.getByLabelText('Title'), 'New Task');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(screen.getByText('Task created successfully')).toBeInTheDocument();
});

// ❌ Bad - Test implementation
it('should call handleSubmit when form is submitted', () => {
  const handleSubmit = jest.fn();
  // ...
});
```

### Service Testing

**Mock API calls**:
```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/tasks', (req, res, ctx) => {
    return res(ctx.json([{ id: '1', title: 'Task 1' }]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## File Naming Conventions

### Files
- **Components**: PascalCase - `TaskCard.tsx`
- **Hooks**: camelCase with `use` prefix - `useTaskData.ts`
- **Services**: camelCase with `.service` suffix - `task.service.ts`
- **Types**: camelCase with `.types` suffix - `task.types.ts`
- **Utils**: camelCase - `formatDate.ts`
- **Constants**: UPPER_SNAKE_CASE or camelCase - `API_ENDPOINTS.ts`

### Folders
- **Lowercase with hyphens**: `task-management/`
- **Or camelCase**: `taskManagement/`
- **Be consistent** within the same directory level

---

## Summary Principles

1. **Type Safety**: Use TypeScript strictly, avoid `any`
2. **Component Composition**: Break down large components
3. **Separation of Concerns**: Business logic in services/hooks, not components
4. **Consistency**: Follow existing patterns in the codebase
5. **Performance**: Memoize expensive operations, use code splitting
6. **Security**: Sanitize user input, never expose secrets
7. **Accessibility**: Use semantic HTML, proper ARIA labels
8. **Internationalization**: Always use i18n, no hard-coded strings
9. **Error Handling**: Graceful degradation, user-friendly messages
10. **Testing**: Test behavior, not implementation

---

For related documentation:
- **ZENCODER.md** - Comprehensive project instructions
- **workspace.md** - Workspace-specific rules
- **repo.md** - Repository structure overview
