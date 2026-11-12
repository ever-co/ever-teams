'use client';

import { type ReactNode, useId } from 'react';
import { useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { modalFieldLabelClass } from '@/core/components/common/modal';
import { CustomSelect } from '@/core/components/common/multiple-select';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button } from '@/core/components/duplicated-components/_button';
import { TaskLine } from '@/core/components/features/timesheet/time-log-task-field';
import { Minus, Spinner } from '@/core/components/icons';
import type { BulkEditChoiceState } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-choice';
import { cn } from '@/core/lib/helpers';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** The value of the "Keep as is" row of a select, which stands for no pick at all. */
const KEEP_VALUE = 'keep-as-is';

const KEEP_OPTION = { id: KEEP_VALUE } as const;

type KeepOption = typeof KEEP_OPTION;

const FIELD_NOTE = 'text-xs text-muted-foreground';

/** A sentence standing where a control would be keeps the control's height, so the fields below do not move. */
const FIELD_STATE = 'flex min-h-9 items-center gap-2 text-[13px] text-muted-foreground';

/** The segments share the row, so the control lines up with the pickers above it. */
const BILLABLE_SEGMENTS = 'flex w-full [&>[data-segment]]:flex-1';

type BillableOption = 'keep' | 'yes' | 'no';

function billableOptionOf(value: boolean | null): BillableOption {
	if (value === null) {
		return 'keep';
	}
	if (value) {
		return 'yes';
	}
	return 'no';
}

function billableValueOf(option: BillableOption): boolean | null {
	if (option === 'keep') {
		return null;
	}
	return option === 'yes';
}

function isKeepOption(option: { id: string }): option is KeepOption {
	return option.id === KEEP_VALUE;
}

function selectValueOf(pickedId: string | null): string {
	return pickedId ?? KEEP_VALUE;
}

function pickedIdOf(value: string): string | null {
	if (!value || value === KEEP_VALUE) {
		return null;
	}
	return value;
}

/** The resting state of a field: muted behind a dash, so it reads neither as a picked value nor as "none". */
function KeepLine() {
	const t = useTranslations();
	return (
		<span className="flex min-w-0 items-center gap-2 text-muted-foreground">
			<Minus aria-hidden="true" className="size-4 shrink-0" />
			<span className="truncate">{t('dashboard.timesheets.BULK_EDIT.KEEP')}</span>
		</span>
	);
}

function ProjectLine({ project }: Readonly<{ project: TOrganizationProject }>) {
	return (
		<span className="flex min-w-0 items-center gap-2">
			<EntityTile
				name={project.name}
				color={project.color}
				imageUrl={project.imageUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{project.name}</span>
		</span>
	);
}

function renderProjectOption(option: TOrganizationProject | KeepOption) {
	if (isKeepOption(option)) {
		return <KeepLine />;
	}
	return <ProjectLine project={option} />;
}

function renderTaskOption(option: TTask | KeepOption) {
	if (isKeepOption(option)) {
		return <KeepLine />;
	}
	return <TaskLine task={option} />;
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
	const labelId = useId();
	return (
		<div role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
			<span id={labelId} className={modalFieldLabelClass}>
				{label}
			</span>
			{children}
		</div>
	);
}

function ProjectField({ project }: Readonly<{ project: BulkEditChoiceState['project'] }>) {
	const t = useTranslations();
	const label = t('dashboard.timesheets.COLUMNS.PROJECT');

	if (project.followsTask) {
		const followedName = project.followedProject?.name;
		let sentence = t('dashboard.timesheets.BULK_EDIT.PROJECT_FOLLOWS_UNNAMED');
		if (followedName) {
			sentence = t('dashboard.timesheets.BULK_EDIT.PROJECT_FOLLOWS', { project: followedName });
		}
		return (
			<Field label={label}>
				<p className={FIELD_STATE}>{sentence}</p>
			</Field>
		);
	}

	if (project.isLoading) {
		return (
			<Field label={label}>
				<p className={FIELD_STATE}>
					<Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin" />
					{t('dashboard.timesheets.BULK_EDIT.PROJECTS_LOADING')}
				</p>
			</Field>
		);
	}

	if (project.hasFailed) {
		return (
			<Field label={label}>
				<div role="alert" className={cn(FIELD_STATE, 'flex-wrap text-destructive-ink')}>
					<span>{t('dashboard.timesheets.BULK_EDIT.PROJECTS_FAILED')}</span>
					<Button type="button" variant="outline" size="sm" onClick={() => void project.retry()}>
						{t('manualTime.DURATION.RETRY')}
					</Button>
				</div>
			</Field>
		);
	}

	return (
		<Field label={label}>
			<CustomSelect
				value={selectValueOf(project.pickedId)}
				onChange={(value: string) => project.pick(pickedIdOf(value))}
				ariaLabel={label}
				className="w-full"
				classNameGroup="max-h-[40vh]"
				options={[KEEP_OPTION, ...project.choices]}
				renderOption={renderProjectOption}
			/>
		</Field>
	);
}

function TaskField({ task }: Readonly<{ task: BulkEditChoiceState['task'] }>) {
	const t = useTranslations();
	const label = t('dashboard.timesheets.COLUMNS.TASK');
	const narrowingProjectName = task.narrowingProjectName;

	return (
		<Field label={label}>
			<CustomSelect
				value={selectValueOf(task.pickedId)}
				onChange={(value: string) => task.pick(pickedIdOf(value))}
				ariaLabel={label}
				className="w-full"
				classNameGroup="max-h-[40vh]"
				options={[KEEP_OPTION, ...task.choices]}
				renderOption={renderTaskOption}
			/>
			{narrowingProjectName && (
				<p className={FIELD_NOTE}>
					{t('dashboard.timesheets.BULK_EDIT.TASKS_OF_PROJECT', { project: narrowingProjectName })}
				</p>
			)}
		</Field>
	);
}

function BillableField({
	billable,
	isDisabled
}: Readonly<{ billable: BulkEditChoiceState['billable']; isDisabled: boolean }>) {
	const t = useTranslations();
	const label = t('dashboard.timesheets.BILLABLE');
	const picked = billableOptionOf(billable.value);
	const items: ReadonlyArray<SegmentedControlItem<BillableOption>> = [
		{ value: 'keep', label: t('dashboard.timesheets.BULK_EDIT.KEEP'), icon: <Minus aria-hidden="true" /> },
		{ value: 'yes', label: t('pages.timesheet.BILLABLE.YES') },
		{ value: 'no', label: t('pages.timesheet.BILLABLE.NO') }
	];

	const pickOption = (option: BillableOption) => {
		const value = billableValueOf(option);
		billable.pick(value);
	};

	return (
		<Field label={label}>
			<SegmentedControl
				items={items}
				value={picked}
				onValueChange={pickOption}
				ariaLabel={label}
				className={cn(BILLABLE_SEGMENTS, isDisabled && 'opacity-50')}
			/>
		</Field>
	);
}

/**
 * The three fields of a bulk edit, each resting on "Keep as is": the select of the single Edit dialog for Project
 * and Task, the app's segmented control for Billable.
 */
export function TimesheetsBulkEditFields({
	fields,
	isDisabled
}: Readonly<{ fields: BulkEditChoiceState; isDisabled: boolean }>) {
	return (
		<fieldset disabled={isDisabled} className="flex min-w-0 flex-col gap-4">
			<ProjectField project={fields.project} />
			<TaskField task={fields.task} />
			<BillableField billable={fields.billable} isDisabled={isDisabled} />
		</fieldset>
	);
}
