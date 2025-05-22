# State Management – Jotai Stores

This folder contains all global state atoms used in the Ever Teams frontend application.
All stores are powered by **[Jotai](https://jotai.org/)** and are strictly organized **by domain (feature)** to improve:

- Code discoverability
- Scalability of the state system
- Separation of concerns
- Developer experience

## Folder Structure

Each subfolder in this directory represents a **feature domain** (e.g., `tasks`, `teams`, `projects`, `auth`, `timer`, `user`, etc.).

```md

core/stores/
├── auth/                 # Auth roles, permissions, invitations
├── common/               # Shared layout & UI states
├── integrations/         # GitHub, GitLab, tenants
├── projects/             # Project-related stores
├── tasks/                # All task-related atoms
├── teams/                # Organization teams and member state
├── timer/                # Timer, logs, daily plans, time slots
├── user/                 # Authenticated user data, avatars, employees
├── index.ts              # Optional: central export hub
└── README.md             # You are here 📘

````

## Naming Conventions

To maintain clarity and avoid collisions, the following naming conventions MUST be respected:

| Type                     | Prefix         | Example                        |
|--------------------------|----------------|--------------------------------|
| Atom for primitives      | `xxxAtom`      | `userAtom`, `menuOpenAtom`     |
| Derived atoms (get-only) | `xxxDerived`   | `activeProjectDerived`         |
| Selector atoms (filters) | `xxxFilterAtom`| `taskFilterAtom`               |
| State with getter logic  | `getXxxAtom`   | `getActiveTeamAtom`            |

> 🚫  **Avoid generic names** like `state`, `value`, or `data`. Always scope atom names based on their purpose and domain.

## Examples

### Good example (`tasks/task-status.ts`) ✨

```ts
export const taskStatusesAtom = atom<ITaskStatus[]>([]);
export const activeTaskStatusIdAtom = atom<string | null>(null);
export const taskStatusFetchingAtom = atom<boolean>(false);
````

### Bad example ❌

```ts
export const state = atom<any>(null);      // ambiguous
export const value = atom<boolean>(true);  // unclear purpose
```

## Guidelines for Contributors

- - ✅ Place each new store in the correct **domain folder**
- - ✅ Name your atoms explicitly and consistently
- - ✅ Prefer **feature-based encapsulation** over shared folders
- - 🔁 If multiple atoms operate together, group them in one file
- - 🚫 Avoid circular dependencies, split files if needed
- - Keep atoms stateless. Move business logic to core/hooks/ when possible

## Future

Eventually, all stores may be moved to a dedicated `packages/stores` workspace for full reusability across apps (web, mobile, extensions). This folder structure prepares for that transition.

---

Made with ❤️ by the Ever Teams contributors.
