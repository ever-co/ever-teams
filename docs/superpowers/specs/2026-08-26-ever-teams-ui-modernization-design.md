# Ever Teams UI Modernization Design

## Objective

Modernize Ever Teams into a clean, compact, full-width application shell inspired by Ever Works while preserving Ever Teams identity and every existing product capability. The first release fixes the named broken surfaces and establishes reusable layout and density rules that can be applied across the remaining web UI without page-specific hacks.

## Confirmed Problems

- The profile menu exposes a Full Width switch although full width is now the only supported layout.
- `fullWidthState` and its local-storage preference still drive conditional branches across the web application.
- `PageLayout` combines a vertically resizable panel, nested height calculations, fixed header offsets, and page-owned overflow containers. Settings adds two more scroll owners.
- Settings uses an accordion navigation, 54px inputs and buttons, 18px labels, large section padding, and viewport-height calculations that do not resemble the shadcn-based parts of the application.
- The My Work submenu uses `href="#"` for both Time & Activity and Work Diary.
- The two-month date-range picker uses large day cells, month spacing, preset spacing, and footer controls.
- The AI chat panel has internal resize support but no professional launcher or complete panel controls. It does not retain conversation history.
- The team dashboard chart is rendered inside `mainHeaderSlot`. Expanding the chart enlarges the fixed header offset and can make the table below unreachable.

## Visual Direction

Ever Teams keeps its timer, indigo accent, product logo, reporting colors, and domain-specific information hierarchy. It adopts the successful Ever Works qualities: quiet surfaces, one-pixel borders, restrained shadows, compact controls, 14px body text, clear 24-30px page headings, consistent eight-pixel spacing increments, and one obvious scroll owner.

The design uses existing Tailwind, Radix, shadcn-style primitives, Lucide icons, and project dependencies. No new UI dependency or backend service is introduced.

## Architecture

### Full-width application shell

Full width becomes structural rather than configurable. Remove the profile switch, persistence key, writable atom, and layout conditionals. `Container` becomes a fluid content wrapper with responsive horizontal padding. Components that need a readable measure use an explicit local `max-width`; they do not revive a global narrow-layout mode.

### Density primitives

Introduce a small set of semantic utility recipes in the existing web style layer for page surfaces, sections, headings, descriptions, form rows, labels, and compact controls. These recipes wrap existing tokens and primitives; they do not create a competing component library.

Default desktop controls are 36-40px high. Dense controls may be 32px. Page sections use 16-24px padding, 8-16px gaps, `rounded-lg`, and subtle borders. Text hierarchy is 30px page title, 20-24px section title, 14px body and labels, and 12px supporting text.

### One-scroll ownership

`LayoutShell` owns the viewport boundary and each page exposes one vertical content scroller. `PageLayout` stops creating a vertically resizable page/header split and stops inserting a synthetic element equal to header height. Headers and page content participate in a normal flex column. Page implementations must not add viewport-height vertical scrollers unless the component is an intentional virtualized region.

Horizontal scrolling remains local to wide tables. This rule fixes Settings and the expanded team dashboard chart while preventing the same defect elsewhere.

### Settings information architecture

Settings becomes a normal page with a compact title and description, a 224-256px sticky vertical navigation, and a bordered content column. Personal and Team remain the two existing routes and all current sections remain available as anchor destinations.

The accordion presentation is replaced with flat Ever Works-style navigation rows using icons, 14px labels, rounded active states, and a distinct danger entry. On smaller screens the navigation becomes a horizontally scrollable tab row above the content. Settings sections become clean bordered panels with compact form rows. Existing save/edit, timezone, language, working-hours, synchronization, invitation, member, integration, issue, and danger behaviors remain unchanged.

### Navigation routes

My Work routes to existing product surfaces:

- Time & Activity: `/reports/time-and-activity`
- Work Diary: `/reports/timesheet/{currentUserId}?name={encodedCurrentUserName}`

Active sidebar state is derived from the current pathname rather than only click indexes, so direct navigation and browser history display the correct item.

### Compact two-month calendar

The range picker keeps two months. Day cells shrink to 30-32px, month gaps and outer padding shrink, captions and weekday labels use 12-13px text, preset buttons use 32px height, and footer actions use compact shadcn sizes. On narrow content widths, months wrap or the popover becomes horizontally scrollable without clipping.

### AI chat

The chat remains a left-side companion panel. A Bot launcher sits on the application sidebar boundary when the panel is closed. When open, a compact control rail provides collapse, drag resize, and expand/restore actions. Width and open state persist locally with safe min/max clamping.

The toolbar adds New Chat and History. Conversation records are stored browser-locally because Ever Teams has no conversation-history API today; no server endpoint or database contract is invented. Stored records contain an id, title, timestamps, and AI SDK messages. Clear conversation remains available. Mobile uses an overlay with an explicit close control.

### Team dashboard chart flow

The dashboard header contains breadcrumbs, title, filters, and summary cards only. The optional chart moves into the normal document flow immediately above the table. Expanding the chart increases page height, so the same page scrollbar reaches the table, pagination, and footer. Chart controls and data behavior remain unchanged.

### Broader consistency sweep

After the foundation is in place, audit the high-use dashboard, projects, tasks, profile, timesheet, Time & Activity, calendar, and sidebar surfaces for hard-coded 50px+ controls, oversized headings, excessive padding, inconsistent backgrounds, and nested vertical overflow. Convert them to the shared recipes where behavior is unchanged. This is a visual normalization pass, not a domain rewrite.

## Accessibility and Responsive Behavior

- Icon-only controls have accessible names and tooltips.
- Navigation uses real links and pathname-derived active state.
- Focus rings remain visible and meet existing shadcn conventions.
- Settings navigation remains usable by keyboard and at mobile widths.
- Chat resize controls are buttons except for the labeled drag handle.
- The table retains local horizontal scrolling while vertical scrolling remains page-owned.

## Testing and Verification

- Architecture tests enforce removal of the Full Width preference and prevent nested page-scroll regressions.
- Component tests cover My Work destinations, Settings navigation, compact calendar classes/behavior, chat launcher and history storage, and dashboard chart placement.
- Existing web unit suite, lint, type/build checks, and production web build must pass.
- Browser verification covers light and dark themes at desktop and mobile widths, including Settings, both My Work links, two-month calendar, chat collapse/resize/expand/history, and the expanded chart with reachable table/pagination/footer.
- Develop deployment verification records the exact merged SHA, image digest, ready pod, Argo health, browser routes, and absence of runtime console errors.

## Non-goals

- No Ever Gauzy API change.
- No new chat-history backend.
- No removal of an Ever Teams feature other than the explicitly retired Full Width switch and its obsolete conditional path.
- No stage or production promotion without a later explicit approval.

