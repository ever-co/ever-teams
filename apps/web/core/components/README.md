# Ever Teams – Core Components Structure

This directory contains **smart UI components** that serve as the functional and visual building blocks of the Ever Teams web application.
It is organized by **usage scope** and **functional domains**, with strict rules for naming and boundaries.

## Folder Structure

Each subfolder inside `core/components/` has a clear responsibility and purpose.

### 1. `common/` – Reusable Shared Components

This folder contains **shared, reusable components** that are used across multiple features or pages.

They are:

- **Not tied to a specific business domain** (e.g., not "auth", "projects", or "reports")
- Often more than just visual primitives – they **may have internal logic, conditions, or hooks**
- Designed to be **composed together** in different contexts

Examples:

- `modal-wrapper.tsx`
- `file-upload-block.tsx`
- `dynamic-form-layout.tsx`
- `confirm-dialog.tsx`
- `custom-table.tsx`

> Use this folder for blocks used in different contexts across the app, not for styled "UI atoms". Those go in `packages/ui/`.

### 2. `pages/` – Page-Scoped Components

This folder groups components that are **strictly limited to a specific page or route**, such as `/dashboard`, `/settings`, etc.

They are:

- Coupled with the page's logic or data
- Not reused outside their context
- Often focused on layout or visual composition of the view

Example:

```md

pages/
├── dashboard/
│   ├── productivity-chart.tsx
│   └── stats-overview\.tsx
└── settings/
└── preferences-form.tsx

```

> Good for organizing local concerns without polluting shared namespaces.

### 3. Feature-Based Folders (e.g. `auth/`, `projects/`, `tasks/`)

Each domain folder corresponds to a **specific product feature or entity**, and contains components tied to that domain.

They are:

- Related to specific business logic (authentication, time tracking, user display, etc.)
- Used by many pages, but only within the scope of their feature
- Often composed of forms, cards, selectors, lists, etc.

Typical folders:

- `auth/`
- `users/`
- `teams/`
- `projects/`
- `tasks/`
- `reports/`
- `timers/`

Example:

```

projects/
├── project-card.tsx
└── project-menu.tsx

```

> Feature folders enforce **bounded context separation**. Do not mix unrelated concerns.

## Naming & Structure Conventions

To ensure consistency and maintainability:

- ✅ Use **kebab-case** for all files and folders
  `user-avatar.tsx`, `team-member-card.tsx`, etc.
- ✅ Every folder must contain an `index.ts` for grouped exports
- ✅ Imports should be simplified using the `index.ts` files
- ✅ Avoid duplication – move shared code into `common/` when reused
- ❌ Never use PascalCase or snake_case for filenames
- ❌ Do not place UI primitives here – use `packages/ui/` for generic styled elements

## Why This Matters

This architecture improves the developer experience by:

- Making components **easy to locate** by intent (page vs feature vs shared)
- Promoting **reuse** while avoiding coupling
- Facilitating **scalability** as new pages or features are added
- Enabling **onboarding of new developers** with minimal friction

## Example Layout

```md

core/
└── components/
        ├── common/
        │   ├── modal-wrapper.tsx
        │   ├── file-upload-block.tsx
        │   └── index.ts
        ├── pages/
        │   ├── dashboard/
        │   │   └── stats-overview\.tsx
        │   └── settings/
        │       └── preferences-form.tsx
        ├── tasks/
        │   ├── task-card.tsx
        │   ├── task-status-selector.tsx
        │   └── index.ts
        └── users/
        ├── user-avatar.tsx
        ├── user-info.tsx
        └── index.ts

```

## Difference with `packages/ui/`

- `core/components/` → Smart, stateful, functional, business-aware
- `packages/ui/` → Dumb, pure UI primitives (buttons, inputs, cards)
- Think: `button.tsx` (dumb) → `packages/ui/`,
  `custom-form-layout.tsx` (smart) → `core/components/common/`

## Summary

The goal of `core/components/` is to provide a **well-structured and scalable foundation** for the UI layer of Ever Teams. By following strict conventions on naming, folder responsibility, and reusability, we ensure a **clean, maintainable, and future-proof architecture**.
