# Gauzy Task Metadata Bootstrap Implementation Plan

> **Execution:** Use `superpowers:subagent-driven-development`. Every production change follows RED -> confirm expected failure -> GREEN -> full regression verification.

**Goal:** Add `GET /task-metadata/bootstrap`, returning any requested subset of the seven existing task metadata collections in one guarded request without changing existing routes or section semantics.

**Pinned base:** `ever-co/ever-gauzy` `origin/develop@99ba709847c5dd6962b9b19b95b941f9c8e5aab9`

**Approved design:** `../specs/2026-08-24-ever-teams-fast-startup-design.md`

## Invariants

- Existing metadata controllers, paths, guards, DTO defaults, mutations, pagination shapes, and services remain unchanged.
- The new route uses `TenantPermissionGuard`, matching existing metadata reads.
- Tenant scope comes from `RequestContext`; the DTO cannot accept `tenantId`.
- `organizationId` is required; team, project, and comma-separated `include` are optional.
- Omitted `include` returns all seven sections. Unknown/empty values return 400 and duplicates are deduplicated.
- Selected loaders start concurrently. Any failure rejects the whole bundle; no partial success is returned.
- Labels call `TagService.findTagsByLevel({ organizationId, organizationTeamId })`, never receive `projectId`, and retain their non-system-tag semantics.
- No migration is needed.

## Task 1: Define contracts and DTO

**Files**

- Create `packages/contracts/src/lib/task-metadata.model.ts`.
- Modify `packages/contracts/src/index.ts`.
- Create `packages/core/src/lib/tasks/task-metadata-bootstrap/dto/task-metadata-bootstrap-query.dto.ts` and its spec/barrel.

```ts
export const TASK_METADATA_SECTIONS = [
	'taskStatuses',
	'taskPriorities',
	'taskSizes',
	'taskLabels',
	'taskVersions',
	'issueTypes',
	'relatedIssueTypes'
] as const;

export type TaskMetadataSection = (typeof TASK_METADATA_SECTIONS)[number];

export interface ITaskMetadataBootstrapQuery {
	organizationId: ID;
	organizationTeamId?: ID;
	projectId?: ID;
	include?: TaskMetadataSection[];
}

export interface ITaskMetadataBootstrapResponse {
	taskStatuses?: IPagination<ITaskStatus>;
	taskPriorities?: IPagination<ITaskPriority>;
	taskSizes?: IPagination<ITaskSize>;
	taskLabels?: IPagination<ITag>;
	taskVersions?: IPagination<ITaskVersion>;
	issueTypes?: IPagination<IIssueType>;
	relatedIssueTypes?: IPagination<ITaskRelatedIssueType>;
}
```

- [ ] Write failing transform/validation tests for omission, sorting-independent deduplication, invalid section, empty include, missing organization, and invalid optional UUIDs.
- [ ] Run `yarn nx test core --runInBand --testPathPatterns=task-metadata-bootstrap-query.dto.spec.ts` and confirm the missing DTO causes RED.
- [ ] Extend the existing organization-scoped DTO base while exposing only `organizationId`; transform comma-separated `include` to a deduplicated array and validate each literal.
- [ ] Re-run and commit as `feat(api): define task metadata bootstrap contract`.

## Task 2: Export the five private read services additively

**Files**

- Modify `tasks/statuses/status.module.ts`, `tasks/priorities/priority.module.ts`, `tasks/sizes/size.module.ts`, `tasks/issue-type/issue-type.module.ts`, and `tasks/related-issue-type/related-issue-type.module.ts` under `packages/core/src/lib`.
- Create `packages/core/src/lib/tasks/task-metadata-bootstrap/task-metadata-bootstrap.module.spec.ts`.

Add only these exports:

```ts
exports: [TaskStatusService]
exports: [TaskPriorityService]
exports: [TaskSizeService]
exports: [IssueTypeService]
exports: [TaskRelatedIssueTypeService]
```

`TaskVersionModule` and `TagModule` already export their services and must remain unchanged.

- [ ] Write failing Nest module-metadata assertions for all five exports.
- [ ] Add exports without changing providers/controllers/imports and re-run the focused test.
- [ ] Commit as `refactor(api): export task metadata read services`.

## Task 3: Aggregate the exact existing reads concurrently

**Files**

- Create `task-metadata-bootstrap.service.ts` and `task-metadata-bootstrap.service.spec.ts` under the new module directory.

```ts
bootstrap(query: ITaskMetadataBootstrapQuery): Promise<ITaskMetadataBootstrapResponse>;
```

Inject `TaskStatusService`, `TaskPriorityService`, `TaskSizeService`, `TagService`, `TaskVersionService`, `IssueTypeService`, and `TaskRelatedIssueTypeService`.

The implementation builds a loader map and executes:

```ts
const entries = await Promise.all(
	include.map(async (section) => [section, await loaders[section]()] as const)
);
return Object.fromEntries(entries) as ITaskMetadataBootstrapResponse;
```

- [ ] First prove all seven literal pagination objects are returned when `include` is omitted.
- [ ] Prove partial include calls only selected services and omits siblings.
- [ ] Prove non-label services receive `{ organizationId, organizationTeamId, projectId }`; labels receive only `{ organizationId, organizationTeamId }`.
- [ ] Use deferred promises to prove every loader starts before any resolves.
- [ ] Prove one rejection rejects the whole bundle.
- [ ] Implement using the existing `fetchAll` methods and `TagService.findTagsByLevel`; do not reimplement fallback/order/filter logic.
- [ ] Run `yarn nx test core --runInBand --testPathPatterns=task-metadata-bootstrap.service.spec.ts` and commit as `feat(api): aggregate task metadata reads`.

## Task 4: Add the standalone guarded endpoint

**Files**

- Create controller/module/specs/barrel under `packages/core/src/lib/tasks/task-metadata-bootstrap/`.
- Modify `packages/core/src/lib/app/app.module.ts`.

```ts
@ApiTags('Task Metadata')
@UseGuards(TenantPermissionGuard)
@Controller('/task-metadata')
export class TaskMetadataBootstrapController {
	constructor(private readonly service: TaskMetadataBootstrapService) {}

	@Get('/bootstrap')
	@UseValidationPipe({ whitelist: true, transform: true })
	bootstrap(@Query() query: TaskMetadataBootstrapQueryDTO) {
		return this.service.bootstrap(query);
	}
}
```

The module imports exactly the seven metadata modules and never imports `TaskModule`.

- [ ] Write failing tests for controller/method paths, HTTP method, exact guard, delegation, error propagation, module imports, absence of `TaskModule`, and additive AppModule registration.
- [ ] Implement the controller/module and register it directly in AppModule.
- [ ] Run focused tests and commit as `feat(api): expose task metadata bootstrap endpoint`.

## Task 5: Full preservation verification

- [ ] Run:

```powershell
yarn nx test core --runInBand --testPathPatterns=task-metadata-bootstrap
yarn nx run contracts:build
yarn nx run core:test --runInBand
yarn nx run core:lint
yarn nx run core:build
yarn nx run api:build
yarn nx affected -t test,lint,build --base=99ba709847c5dd6962b9b19b95b941f9c8e5aab9 --head=HEAD
git diff --check
```

- [ ] Audit the base/head diff: five additive exports, one standalone module/route, no existing controller/service/DTO/default/guard changes, no `TaskModule` import, no migration, no label project filter, and no deleted or skipped test.
- [ ] Hand off this strict mixed-version rule to Teams:

```ts
if ([404, 405, 501].includes(status)) return loadLegacyMetadataSections();
throw error;
```

Authentication, authorization, validation, throttling, cancellation, network failure, and ordinary server errors never trigger legacy fan-out.
