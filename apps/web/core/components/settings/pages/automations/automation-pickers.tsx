'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Check } from '@/core/components/icons';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useTaskLabelsQuery } from '@/core/hooks/tasks/use-task-labels-query';
import { useTaskPrioritiesQuery } from '@/core/hooks/tasks/use-task-priorities-query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { cn } from '@/core/lib/helpers';
import { activeTeamState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { tasksByTeamState } from '@/core/stores/teams/team-tasks';

export const SELECT_TRIGGER = 'h-8 w-full min-w-0 text-[13px] sm:w-56';
export const SELECT_CONTENT = 'max-h-72 w-64 overflow-y-auto p-1';

/** One choice of a picker. */
export interface AutomationOption {
	id: string;
	label: string;
	color?: string | null;
}

/** What the rule editor and the dialogs pick from: the active team's own data, already loaded by the app. */
export interface AutomationLookups {
	statuses: AutomationOption[];
	priorities: AutomationOption[];
	labels: AutomationOption[];
	members: AutomationOption[];
	projects: AutomationOption[];
	teams: AutomationOption[];
	tasks: AutomationOption[];
	/** A status, priority, label, person, project, team or task by id or value, for the history and the dry run. */
	nameOf: (value: string) => string | undefined;
}

type Named = { id?: string | null; name?: string | null; value?: string | null; color?: string | null };

function optionsOf(items: readonly Named[] | undefined, valueKey: 'id' | 'value' = 'id'): AutomationOption[] {
	return (items ?? [])
		.map((item) => ({ id: String(item[valueKey] ?? item.id ?? ''), label: String(item.name ?? item.value ?? ''), color: item.color }))
		.filter((option) => option.id && option.label);
}

type MemberLike = {
	employeeId?: string | null;
	fullName?: string | null;
	name?: string | null;
	employee?: { id?: string | null; fullName?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
};

export function memberOptionsOf(members: readonly MemberLike[] | undefined): AutomationOption[] {
	const seen = new Set<string>();
	const options: AutomationOption[] = [];
	for (const member of members ?? []) {
		const id = member.employeeId ?? member.employee?.id ?? null;
		const label = member.employee?.fullName || member.employee?.user?.name || member.fullName || member.name || member.employee?.user?.email;
		if (!id || !label || seen.has(id)) continue;
		seen.add(id);
		options.push({ id, label });
	}
	return options.sort((a, b) => a.label.localeCompare(b.label));
}

type TaskLike = { id?: string | null; title?: string | null; taskNumber?: string | null; number?: number | null };

export function taskOptionsOf(tasks: readonly TaskLike[] | undefined): AutomationOption[] {
	return (tasks ?? [])
		.filter((task): task is TaskLike & { id: string } => !!task.id)
		.map((task) => {
			const reference = task.taskNumber ?? (task.number !== null && task.number !== undefined ? `#${task.number}` : '');
			return { id: task.id, label: [reference, task.title ?? ''].filter(Boolean).join(' ') };
		});
}

export function useAutomationLookups(): AutomationLookups {
	const { taskStatuses } = useTaskStatusesQuery();
	const { taskPriorities } = useTaskPrioritiesQuery();
	const { taskLabels } = useTaskLabelsQuery();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const organizationTeams = useAtomValue(organizationTeamsState);
	const tasks = useAtomValue(tasksByTeamState);

	return useMemo(() => {
		// A rule names statuses and priorities by their value (`in-progress`), which every project's row of them shares.
		const statuses = dedupe(optionsOf(taskStatuses as Named[], 'value'));
		const priorities = dedupe(optionsOf(taskPriorities as Named[], 'value'));
		const labels = optionsOf(taskLabels as Named[]);
		const members = memberOptionsOf((activeTeam?.members ?? []) as MemberLike[]);
		const projects = optionsOf(organizationProjects as Named[]);
		const teams = optionsOf(organizationTeams as Named[]);
		const taskOptions = taskOptionsOf(tasks as TaskLike[]);
		const names = new Map<string, string>();
		for (const list of [taskOptions, teams, projects, members, labels, priorities, statuses]) {
			for (const option of list) names.set(option.id.toLowerCase(), option.label);
		}
		for (const row of [...((taskStatuses ?? []) as Named[]), ...((taskPriorities ?? []) as Named[])]) {
			if (row.id && row.name) names.set(String(row.id).toLowerCase(), row.name);
		}
		return {
			statuses,
			priorities,
			labels,
			members,
			projects,
			teams,
			tasks: taskOptions,
			nameOf: (value: string) => names.get(String(value).toLowerCase())
		};
	}, [activeTeam?.members, organizationProjects, organizationTeams, taskLabels, taskPriorities, taskStatuses, tasks]);
}

function dedupe(options: AutomationOption[]): AutomationOption[] {
	const seen = new Set<string>();
	return options.filter((option) => {
		const key = option.id.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Several values from a short list (statuses, labels, people): each a toggle button, so a keyboard and a screen
 * reader can go through them without a popover. A value the list no longer has (a deleted label) stays shown, so it
 * can be taken off.
 */
export function ChipPicker({
	options,
	value,
	onChange,
	label,
	disabled
}: Readonly<{ options: AutomationOption[]; value: string[]; onChange: (next: string[]) => void; label: string; disabled?: boolean }>) {
	const t = useTranslations();
	const known = new Set(options.map((option) => option.id));
	const extra: AutomationOption[] = value.filter((id) => !known.has(id)).map((id) => ({ id, label: id }));
	const all: AutomationOption[] = [...options, ...extra];
	const toggle = (id: string) => onChange(value.includes(id) ? value.filter((one) => one !== id) : [...value, id]);

	if (!all.length) {
		return <p className="text-xs text-muted-foreground">{t('settings.automations.NOTHING_TO_PICK')}</p>;
	}
	return (
		<div role="group" aria-label={label} className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto py-0.5">
			{all.map((option) => {
				const selected = value.includes(option.id);
				return (
					<button
						key={option.id}
						type="button"
						aria-pressed={selected}
						disabled={disabled}
						onClick={() => toggle(option.id)}
						className={cn(
							'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs outline-none transition-colors hairline-ring ring-border focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:opacity-60',
							selected ? 'bg-foreground/[0.08] font-medium text-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
						)}
					>
						{option.color && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />}
						<span className="truncate">{option.label}</span>
						{selected && <Check aria-hidden="true" className="size-3 shrink-0" />}
					</button>
				);
			})}
		</div>
	);
}

/** One value from a list, or "none" (`allowNone`). */
export function OptionSelect({
	id,
	options,
	value,
	onChange,
	placeholder,
	noneLabel,
	disabled
}: Readonly<{
	id?: string;
	options: AutomationOption[];
	value: string | null;
	onChange: (next: string | null) => void;
	placeholder: string;
	noneLabel?: string;
	disabled?: boolean;
}>) {
	const NONE = '__none__';
	const hasValue = !!value && options.some((option) => option.id === value);
	// The empty string is the select's "nothing chosen" (it stays controlled).
	const current = value || (noneLabel ? NONE : '');
	return (
		<Select value={current} onValueChange={(next) => onChange(!next || next === NONE ? null : next)} disabled={disabled}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent align="start" className={SELECT_CONTENT}>
				<SelectGroup>
					{noneLabel && (
						<SelectItem value={NONE} textValue={noneLabel} className="text-[13px]">
							{noneLabel}
						</SelectItem>
					)}
					{value && !hasValue && (
						<SelectItem value={value} textValue={value} className="text-[13px] text-muted-foreground">
							{value}
						</SelectItem>
					)}
					{options.map((option) => (
						<SelectItem key={option.id} value={option.id} textValue={option.label} className="text-[13px]">
							{option.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
