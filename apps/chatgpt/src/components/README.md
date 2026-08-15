# UI Components

This directory will contain React/HTML components for rich ChatGPT UI rendering.

## Component Structure

Each component should:
1. Be built as a standalone HTML bundle
2. Include inline styles or bundled CSS
3. Support data hydration via `structuredContent`
4. Follow ChatGPT widget design guidelines

## Planned Components

### Timer Widget (`TimerWidget.tsx`)
Displays active timer status with:
- Project name
- Elapsed time
- Start/stop controls
- Description

**Usage**: Linked via `openai/outputTemplate: "component://timerWidget"`

### Time Entry Card (`TimeEntryCard.tsx`)
Displays completed time entry with:
- Project and task details
- Duration and time range
- Tags and billable status
- Edit/delete actions

**Usage**: Linked via `openai/outputTemplate: "component://timeEntryCard"`

### Project Card (`ProjectCard.tsx`)
Displays project information:
- Project name and description
- Team members
- Budget and time tracking stats
- Status

**Usage**: Linked via `openai/outputTemplate: "component://projectCard"`

### Project List (`ProjectList.tsx`)
List view of multiple projects:
- Filterable/sortable grid
- Quick stats per project
- Search functionality

**Usage**: Linked via `openai/outputTemplate: "component://projectList"`

### Task Card (`TaskCard.tsx`)
Displays task details:
- Task title and description
- Assignees
- Due date and priority
- Status and progress

**Usage**: Linked via `openai/outputTemplate: "component://taskCard"`

### Task List (`TaskList.tsx`)
List view of multiple tasks:
- Kanban or list view
- Filter by status, assignee, project
- Drag-and-drop support

**Usage**: Linked via `openai/outputTemplate: "component://taskList"`

### Report View (`ReportView.tsx`)
Displays time tracking reports:
- Charts and visualizations
- Summary statistics
- Export options
- Date range selector

**Usage**: Linked via `openai/outputTemplate: "component://reportView"`

## Building Components

### Development
```bash
# Component development with hot reload
yarn dev:components
```

### Production Build
```bash
# Build all components as HTML bundles
yarn build:components

# Output: dist/components/
# - timerWidget.html
# - timeEntryCard.html
# - projectCard.html
# - etc.
```

## Component Registration

Components are registered in the MCP server as HTML resources:

```typescript
// Example registration
server.registerResource({
  uri: "component://timerWidget",
  name: "Timer Widget",
  mimeType: "text/html+skybridge",
  content: compiledHTMLBundle
});
```

## Styling Guidelines

- Use inline styles or scoped CSS
- Follow Ever-Teams brand colors
- Ensure responsive design
- Support dark/light themes
- Maintain accessibility (WCAG 2.1 AA)

## Data Hydration

Components receive data via `structuredContent`:

```typescript
// In metadata enhancer
enhanced.structuredContent = {
  timerId: "123",
  projectName: "Website Redesign",
  duration: 3600,
  startTime: "2025-11-11T14:30:00Z",
  isRunning: true
};
```

Component accesses via:
```javascript
const data = window.__WIDGET_DATA__ || {};
```

## Next Steps

1. Set up component build pipeline (Vite, Webpack, or similar)
2. Create base component templates
3. Implement each component with proper styling
4. Add component registration to server
5. Test components in ChatGPT
