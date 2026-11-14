'use client';

import { useCallback, useMemo, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { BillableSwitch } from '@/core/components/common/billable-switch';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { Building, Clock, DollarCircle, Folder, Plus, Scale, Users, X } from '@/core/components/icons';
import {
	ADD_ROUND_BUTTON,
	CHIP_REMOVE_BUTTON,
	ENTITY_CHIP,
	FIELD_ERROR,
	INLINE_FIELD,
	VALUE_BUTTON,
	VALUE_CHIP
} from '@/core/components/projects/composer/composer-recipes';
import { MUTED_VALUE } from '@/core/components/projects/project-cells';
import { PropertyRow } from '@/core/components/projects/project-properties';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';
import { type GoalComposer, type GoalComposerMode, useGoalComposer } from '@/core/hooks/time-goals/use-goal-composer';
import { cn } from '@/core/lib/helpers';
import type { TeamPerson } from '@/core/lib/utils/dashboards/team';
import { GOAL_NAME_MAX_LENGTH, GOAL_PERIODS, type GoalOwnerChoice } from '@/core/lib/utils/time-goals';
import { ETimeGoalComparison, type ETimeGoalPeriod, type ITimeGoal } from '@/core/types/interfaces/timesheet/time-goal';
import { GOAL_FORM_PERIOD_KEYS } from './goal-labels';

const NAME_FIELD =
	'w-full min-w-0 border-0 bg-transparent p-0 text-xl font-semibold text-foreground outline-none placeholder:font-semibold placeholder:text-muted-foreground/50';

/** A project or a client the goal may count. */
export interface GoalPickable {
	id: string;
	name: string;
	color?: string | null;
	imageUrl?: string | null;
}

/** Whom the person may set goals for, besides themselves. */
export interface GoalOwnerOptions {
	/** They manage the active team (or act for everyone): they may pick one of its members, or all of it. */
	canPickOthers: boolean;
	members: ReadonlyArray<TeamPerson>;
	teamId: string | null;
	teamName: string | null;
}

function FieldError({ message }: Readonly<{ message: DottedLanguageObjectStringPaths | undefined }>) {
	const t = useTranslations();
	if (!message) {
		return null;
	}
	return (
		<p role="alert" className={FIELD_ERROR}>
			{t(message)}
		</p>
	);
}

function isSubmitShortcut(event: KeyboardEvent<HTMLElement>) {
	const hasModifier = event.metaKey || event.ctrlKey;
	return event.key === 'Enter' && hasModifier;
}

function keepPlainEnterInField(event: KeyboardEvent<HTMLInputElement>) {
	const isPlainEnter = event.key === 'Enter' && !isSubmitShortcut(event);
	if (isPlainEnter) {
		event.preventDefault();
	}
}

/** Chips of what is picked, and a dashed round button to add more; "Any project" while nothing is. */
function PickedChips({
	items,
	pickedIds,
	emptyLabel,
	addLabel,
	searchPlaceholder,
	onToggle
}: Readonly<{
	items: ReadonlyArray<GoalPickable>;
	pickedIds: ReadonlyArray<string>;
	emptyLabel: string;
	addLabel: string;
	searchPlaceholder: string;
	onToggle: (id: string) => void;
}>) {
	const t = useTranslations();
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			items.map((item) => ({
				key: item.id,
				value: item.id,
				label: item.name,
				icon: (
					<EntityTile
						name={item.name}
						color={item.color}
						imageUrl={item.imageUrl}
						className="size-4 text-[7px]"
					/>
				)
			})),
		[items]
	);
	const picked = items.filter((item) => pickedIds.includes(item.id));
	const hasPicked = picked.length > 0;
	const canAdd = items.length > 0;
	return (
		<>
			{!hasPicked && <span className={MUTED_VALUE}>{emptyLabel}</span>}
			{picked.map((item) => (
				<span key={item.id} className={cn(VALUE_CHIP, ENTITY_CHIP)}>
					<EntityTile
						name={item.name}
						color={item.color}
						imageUrl={item.imageUrl}
						className="size-4 text-[7px]"
					/>
					<span className="truncate">{item.name}</span>
					<button
						type="button"
						onClick={() => onToggle(item.id)}
						aria-label={t('pages.projects.modals.removeItem', { name: item.name })}
						className={CHIP_REMOVE_BUTTON}
					>
						<X aria-hidden="true" />
					</button>
				</span>
			))}
			{canAdd && (
				<TaskPropertyMenu
					options={options}
					isSelected={(value) => pickedIds.includes(value)}
					onSelect={onToggle}
					multiple
					searchPlaceholder={searchPlaceholder}
					triggerLabel={addLabel}
					triggerClassName="rounded-full"
					popupClassName="w-64"
				>
					<span className={ADD_ROUND_BUTTON}>
						<Plus aria-hidden="true" />
					</span>
				</TaskPropertyMenu>
			)}
		</>
	);
}

function MemberPick({
	members,
	memberId,
	onPick
}: Readonly<{ members: ReadonlyArray<TeamPerson>; memberId: string | null; onPick: (id: string) => void }>) {
	const t = useTranslations();
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			members.map((member) => ({
				key: member.employeeId,
				value: member.employeeId,
				label: member.name
			})),
		[members]
	);
	const picked = members.find((member) => member.employeeId === memberId);
	let trigger: ReactNode = <span className="text-muted-foreground/80">{t('dashboard.goals.form.PICK_MEMBER')}</span>;
	if (picked) {
		trigger = <MemberCell name={picked.name} imageUrl={picked.imageUrl} />;
	}
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => value === memberId}
			onSelect={onPick}
			searchPlaceholder={t('dashboard.goals.form.SEARCH_MEMBERS')}
			triggerLabel={t('dashboard.goals.form.PICK_MEMBER')}
			triggerClassName={VALUE_BUTTON}
			popupClassName="w-64"
		>
			{trigger}
		</TaskPropertyMenu>
	);
}

function OwnerRow({ composer, owners }: Readonly<{ composer: GoalComposer; owners: GoalOwnerOptions }>) {
	const t = useTranslations();
	const { draft, errors } = composer;
	const items = useMemo<SegmentedControlItem<GoalOwnerChoice>[]>(
		() => [
			{ value: 'self', label: t('dashboard.goals.form.FOR_ME') },
			{ value: 'member', label: t('dashboard.goals.form.FOR_MEMBER') },
			{ value: 'team', label: t('dashboard.goals.form.FOR_TEAM') }
		],
		[t]
	);
	let hint: ReactNode;
	if (draft.owner === 'team' && owners.teamName) {
		hint = (
			<p className="text-xs text-muted-foreground">
				{t('dashboard.goals.form.TEAM_HINT', { team: owners.teamName })}
			</p>
		);
	}
	return (
		<PropertyRow icon={<Users />} label={t('dashboard.goals.form.FOR')} hint={hint}>
			<div className="-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [scrollbar-width:none]">
				<SegmentedControl
					items={items}
					value={draft.owner}
					onValueChange={composer.setOwner}
					ariaLabel={t('dashboard.goals.form.FOR')}
				/>
			</div>
			{draft.owner === 'member' && (
				<MemberPick members={owners.members} memberId={draft.memberId} onPick={composer.setMemberId} />
			)}
			<FieldError message={errors.member} />
		</PropertyRow>
	);
}

function TargetRow({ composer }: Readonly<{ composer: GoalComposer }>) {
	const t = useTranslations();
	const { draft, errors } = composer;
	const comparisons = useMemo<SegmentedControlItem<ETimeGoalComparison>[]>(
		() => [
			{ value: ETimeGoalComparison.AT_LEAST, label: t('dashboard.goals.form.AT_LEAST') },
			{ value: ETimeGoalComparison.AT_MOST, label: t('dashboard.goals.form.AT_MOST') }
		],
		[t]
	);
	const periods = useMemo<SegmentedControlItem<ETimeGoalPeriod>[]>(
		() => GOAL_PERIODS.map((period) => ({ value: period, label: t(GOAL_FORM_PERIOD_KEYS[period]) })),
		[t]
	);
	return (
		<>
			<PropertyRow icon={<Scale />} label={t('dashboard.goals.form.RULE')}>
				<SegmentedControl
					items={comparisons}
					value={draft.comparison}
					onValueChange={composer.setComparison}
					ariaLabel={t('dashboard.goals.form.RULE')}
				/>
			</PropertyRow>
			<PropertyRow icon={<Clock />} label={t('dashboard.goals.form.HOURS')}>
				<span className="inline-flex items-center gap-1">
					<input
						value={draft.hours}
						onChange={(event) => composer.setHours(event.target.value)}
						onKeyDown={keepPlainEnterInField}
						inputMode="decimal"
						placeholder="20"
						aria-label={t('dashboard.goals.form.HOURS_LABEL')}
						aria-invalid={Boolean(errors.hours)}
						className={cn(INLINE_FIELD, 'mx-0 w-16 text-right tabular-nums')}
					/>
					<span className="text-[13px] text-muted-foreground">{t('dashboard.goals.form.HOURS_UNIT')}</span>
				</span>
				<div className="-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1 [scrollbar-width:none]">
					<SegmentedControl
						items={periods}
						value={draft.period}
						onValueChange={composer.setPeriod}
						ariaLabel={t('dashboard.goals.form.PERIOD')}
					/>
				</div>
				<FieldError message={errors.hours} />
			</PropertyRow>
		</>
	);
}

function saveErrorKeyOf(saveError: GoalComposer['saveError']): DottedLanguageObjectStringPaths | undefined {
	if (saveError === 'forbidden') {
		return 'dashboard.goals.form.FORBIDDEN';
	}
	if (saveError === 'save') {
		return 'dashboard.goals.form.SAVE_FAILED';
	}
	return undefined;
}

interface GoalComposerFormProps {
	mode: GoalComposerMode;
	goal?: ITimeGoal | null;
	owners: GoalOwnerOptions;
	/** Whom an edited goal counts, written out: it is fixed at creation. */
	ownerLabel?: string | null;
	projects: ReadonlyArray<GoalPickable>;
	clients: ReadonlyArray<GoalPickable>;
	onClose: () => void;
}

function GoalComposerForm({
	mode,
	goal,
	owners,
	ownerLabel,
	projects,
	clients,
	onClose
}: Readonly<GoalComposerFormProps>) {
	const t = useTranslations();
	const focusOnMount = useFocusOnMount<HTMLInputElement>();
	const handleDone = useCallback(
		(saved: ITimeGoal) => {
			onClose();
			const name = saved.name ?? '';
			if (mode === 'edit') {
				toast.success(t('dashboard.goals.form.SAVED', { name }));
				return;
			}
			toast.success(t('dashboard.goals.form.CREATED', { name }));
		},
		[mode, onClose, t]
	);
	const composer = useGoalComposer({ mode, goal, activeTeamId: owners.teamId, onDone: handleDone });
	const { draft, errors } = composer;
	const showsOwnerChoice = !composer.isEdit && owners.canPickOthers;
	const showsOwnerLabel = composer.isEdit && Boolean(ownerLabel);

	let title = t('dashboard.goals.form.CREATE_TITLE');
	let submitLabel = t('dashboard.goals.form.CREATE');
	if (composer.isEdit) {
		title = t('dashboard.goals.form.EDIT_TITLE');
		submitLabel = t('common.SAVE_CHANGES');
	}

	const submit = () => {
		void composer.submit();
	};
	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		submit();
	};
	const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
		if (!isSubmitShortcut(event)) {
			return;
		}
		event.preventDefault();
		submit();
	};

	return (
		<form noValidate onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex min-h-0 flex-1 flex-col">
			<AppDialogHeader title={title} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
				<div className="flex min-h-11 items-center pt-1">
					<input
						ref={focusOnMount}
						data-initial-focus=""
						value={draft.name}
						onChange={(event) => composer.setName(event.target.value)}
						onKeyDown={keepPlainEnterInField}
						maxLength={GOAL_NAME_MAX_LENGTH}
						placeholder={t('dashboard.goals.form.NAME_PLACEHOLDER')}
						aria-label={t('dashboard.goals.form.NAME_LABEL')}
						aria-invalid={Boolean(errors.name)}
						className={NAME_FIELD}
					/>
				</div>
				<FieldError message={errors.name} />
				<section
					aria-label={t('dashboard.goals.form.PROPERTIES')}
					className="mt-4 hairline-t border-border pt-2"
				>
					<TargetRow composer={composer} />
					{showsOwnerChoice && <OwnerRow composer={composer} owners={owners} />}
					{showsOwnerLabel && (
						<PropertyRow icon={<Users />} label={t('dashboard.goals.form.FOR')}>
							<span className="truncate text-[13px] text-foreground">{ownerLabel}</span>
						</PropertyRow>
					)}
					<PropertyRow icon={<Folder />} label={t('dashboard.goals.form.PROJECTS')}>
						<PickedChips
							items={projects}
							pickedIds={draft.projectIds}
							emptyLabel={t('dashboard.goals.form.ANY_PROJECT')}
							addLabel={t('dashboard.goals.form.ADD_PROJECTS')}
							searchPlaceholder={t('dashboard.goals.form.SEARCH_PROJECTS')}
							onToggle={composer.toggleProject}
						/>
					</PropertyRow>
					<PropertyRow icon={<Building />} label={t('dashboard.goals.form.CLIENTS')}>
						<PickedChips
							items={clients}
							pickedIds={draft.clientIds}
							emptyLabel={t('dashboard.goals.form.ANY_CLIENT')}
							addLabel={t('dashboard.goals.form.ADD_CLIENTS')}
							searchPlaceholder={t('dashboard.goals.form.SEARCH_CLIENTS')}
							onToggle={composer.toggleClient}
						/>
					</PropertyRow>
					<PropertyRow
						icon={<DollarCircle />}
						label={t('dashboard.goals.form.BILLABLE')}
						hint={
							<p className="text-xs text-muted-foreground">{t('dashboard.goals.form.BILLABLE_HINT')}</p>
						}
					>
						<BillableSwitch
							isBillable={draft.billableOnly}
							onChange={composer.setBillableOnly}
							label={t('dashboard.goals.form.BILLABLE')}
							isLabelVisible={false}
						/>
					</PropertyRow>
				</section>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<FieldError message={saveErrorKeyOf(composer.saveError)} />
				<span className="ml-auto flex items-center gap-2">
					<Button type="button" variant="ghost" onClick={onClose}>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" disabled={composer.isSubmitting} aria-busy={composer.isSubmitting}>
						{submitLabel}
					</Button>
				</span>
			</div>
		</form>
	);
}

interface GoalDialogProps extends GoalComposerFormProps {
	open: boolean;
}

/**
 * New goal and Edit goal: a name, at least or at most a number of hours per day, week or month, and optionally the
 * projects, clients or billable time it counts; a team manager also picks whom it is for. The rows are the project
 * dialog's property rows.
 */
export function GoalDialog({ open, onClose, ...form }: Readonly<GoalDialogProps>) {
	return (
		<AppDialog open={open} onClose={onClose} keepOpenOnOutsideClick>
			{open && <GoalComposerForm {...form} onClose={onClose} />}
		</AppDialog>
	);
}
