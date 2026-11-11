'use client';

import { useId, useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Input } from '@/core/components/common/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, Trash } from '@/core/components/icons';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	actionDraftOf,
	actionInputOf,
	conditionDraftOf,
	conditionInputOf,
	TASK_AUTOMATION_ACTIONS,
	TASK_AUTOMATION_CATEGORIES,
	TASK_AUTOMATION_CONDITIONS,
	TASK_AUTOMATION_TRIGGERS,
	type TaskAutomationActionDraft,
	type TaskAutomationConditionDraft,
	type TaskAutomationForm,
	type TaskAutomationFormError,
	validateTaskAutomationForm
} from '@/core/lib/utils/task-automations';
import {
	ETaskAutomationAction,
	ETaskAutomationCondition,
	ETaskAutomationStatusCategory,
	ETaskAutomationTrigger,
	TASK_AUTOMATION_LIMITS
} from '@/core/types/interfaces/common/task-automation';
import { type AutomationLookups, type AutomationOption, ChipPicker, OptionSelect, SELECT_CONTENT, SELECT_TRIGGER } from './automation-pickers';

type Key = DottedLanguageObjectStringPaths;
const FIELD_LABEL = 'text-xs font-medium text-muted-foreground';
const ITEM = 'flex flex-col gap-2 rounded-lg bg-card px-3 py-2.5 hairline-ring ring-border';
const TEXTAREA =
	'min-h-16 w-full resize-y rounded-md bg-card px-2.5 py-1.5 text-[13px] text-foreground outline-none hairline-ring ring-border placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function TypeSelect<T extends string>({
	id,
	value,
	values,
	labelOf,
	onChange
}: Readonly<{ id?: string; value: T; values: readonly T[]; labelOf: (value: T) => string; onChange: (value: T) => void }>) {
	return (
		<Select value={value} onValueChange={(next) => next && onChange(next as T)}>
			<SelectTrigger id={id} className={SELECT_TRIGGER}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="start" className={SELECT_CONTENT}>
				<SelectGroup>
					{values.map((one) => (
						<SelectItem key={one} value={one} textValue={labelOf(one)} className="text-[13px]">
							{labelOf(one)}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

function ErrorLine({ errors, itemKey }: Readonly<{ errors: TaskAutomationFormError[]; itemKey?: string }>) {
	const t = useTranslations();
	const mine = errors.filter((error) => error.itemKey === itemKey);
	if (!mine.length) return null;
	return (
		<p role="alert" className="text-xs text-destructive-ink">
			{mine.map((error) => t(`settings.automations.errors.${error.code}` as Key)).join(' ')}
		</p>
	);
}

function ConditionEditor({
	draft,
	lookups,
	errors,
	onChange,
	onRemove
}: Readonly<{
	draft: TaskAutomationConditionDraft;
	lookups: AutomationLookups;
	errors: TaskAutomationFormError[];
	onChange: (draft: TaskAutomationConditionDraft) => void;
	onRemove: () => void;
}>) {
	const t = useTranslations();
	const typeId = useId();
	const input = conditionInputOf(draft.type);
	const categories: AutomationOption[] = TASK_AUTOMATION_CATEGORIES.map((category) => ({
		id: category,
		label: t(`settings.automations.categories.${category}` as Key)
	}));
	const optionsByInput: Partial<Record<typeof input, AutomationOption[]>> = {
		statuses: lookups.statuses,
		categories,
		priorities: lookups.priorities,
		labels: lookups.labels,
		members: lookups.members
	};
	const label = t(`settings.automations.conditions.${draft.type}` as Key);
	return (
		<div className={ITEM}>
			<div className="flex items-center gap-2">
				<label htmlFor={typeId} className="sr-only">
					{t('settings.automations.IF')}
				</label>
				<TypeSelect
					id={typeId}
					value={draft.type}
					values={TASK_AUTOMATION_CONDITIONS}
					labelOf={(type) => t(`settings.automations.conditions.${type}` as Key)}
					onChange={(type: ETaskAutomationCondition) => onChange({ ...draft, type, values: type === draft.type ? draft.values : [] })}
				/>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`${t('settings.automations.REMOVE')}: ${label}`} className="ml-auto text-muted-foreground">
					<Trash />
				</Button>
			</div>
			{input === 'text' && (
				<Input
					value={draft.text}
					maxLength={200}
					onChange={(event) => onChange({ ...draft, text: event.target.value })}
					placeholder={t('settings.automations.TITLE_TEXT_PLACEHOLDER')}
					aria-label={label}
					className="h-8 text-[13px]"
				/>
			)}
			{input !== 'text' && input !== 'none' && (
				<ChipPicker options={optionsByInput[input] ?? []} value={draft.values} onChange={(values) => onChange({ ...draft, values })} label={label} />
			)}
			<ErrorLine errors={errors} itemKey={draft.key} />
		</div>
	);
}

function ActionEditor({
	draft,
	lookups,
	errors,
	onChange,
	onRemove
}: Readonly<{
	draft: TaskAutomationActionDraft;
	lookups: AutomationLookups;
	errors: TaskAutomationFormError[];
	onChange: (draft: TaskAutomationActionDraft) => void;
	onRemove: () => void;
}>) {
	const t = useTranslations();
	const typeId = useId();
	const input = actionInputOf(draft.type);
	const label = t(`settings.automations.actions.${draft.type}` as Key);
	return (
		<div className={ITEM}>
			<div className="flex items-center gap-2">
				<label htmlFor={typeId} className="sr-only">
					{t('settings.automations.THEN')}
				</label>
				<TypeSelect
					id={typeId}
					value={draft.type}
					values={TASK_AUTOMATION_ACTIONS}
					labelOf={(type) => t(`settings.automations.actions.${type}` as Key)}
					onChange={(type: ETaskAutomationAction) => onChange({ ...draft, type })}
				/>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`${t('settings.automations.REMOVE')}: ${label}`} className="ml-auto text-muted-foreground">
					<Trash />
				</Button>
			</div>
			{input === 'status' && (
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<TypeSelect
						value={draft.statusMode}
						values={['category', 'status'] as const}
						labelOf={(mode) => t(mode === 'category' ? 'settings.automations.STATUS_MODE_CATEGORY' : 'settings.automations.STATUS_MODE_STATUS')}
						onChange={(statusMode: 'category' | 'status') => onChange({ ...draft, statusMode })}
					/>
					{draft.statusMode === 'category' ? (
						<TypeSelect
							value={draft.category}
							values={TASK_AUTOMATION_CATEGORIES}
							labelOf={(category) => t(`settings.automations.categories.${category}` as Key)}
							onChange={(category: ETaskAutomationStatusCategory) => onChange({ ...draft, category })}
						/>
					) : (
						<OptionSelect
							options={lookups.statuses}
							value={draft.status || null}
							onChange={(status) => onChange({ ...draft, status: status ?? '' })}
							placeholder={t('settings.automations.CHOOSE_STATUS')}
						/>
					)}
				</div>
			)}
			{input === 'priority' && (
				<OptionSelect
					options={lookups.priorities}
					value={draft.priority || null}
					onChange={(priority) => onChange({ ...draft, priority: priority ?? '' })}
					placeholder={t('settings.automations.CHOOSE_PRIORITY')}
				/>
			)}
			{input === 'members' && (
				<ChipPicker options={lookups.members} value={draft.employeeIds} onChange={(employeeIds) => onChange({ ...draft, employeeIds })} label={label} />
			)}
			{input === 'labels' && (
				<ChipPicker options={lookups.labels} value={draft.tagIds} onChange={(tagIds) => onChange({ ...draft, tagIds })} label={label} />
			)}
			{input === 'message' && (
				<textarea
					value={draft.message}
					maxLength={TASK_AUTOMATION_LIMITS.messageLength}
					onChange={(event) => onChange({ ...draft, message: event.target.value })}
					placeholder={t('settings.automations.MESSAGE_PLACEHOLDER')}
					aria-label={t('settings.automations.MESSAGE')}
					className={TEXTAREA}
				/>
			)}
			<ErrorLine errors={errors} itemKey={draft.key} />
		</div>
	);
}

function Block({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</legend>
			{children}
		</fieldset>
	);
}

/**
 * The rule editor (create or edit): name, description, scope, the trigger (with the statuses of a status change), the
 * conditions and the actions, each list editable item by item. The platform's checks run before the request, so the
 * editor points at the field; what the platform still refuses is shown in a toast with its reason.
 */
export function AutomationRuleEditor({
	open,
	mode,
	initial,
	lookups,
	isSaving,
	onClose,
	onSave
}: Readonly<{
	open: boolean;
	mode: 'create' | 'edit';
	initial: TaskAutomationForm;
	lookups: AutomationLookups;
	isSaving: boolean;
	onClose: () => void;
	onSave: (form: TaskAutomationForm) => Promise<void>;
}>) {
	const t = useTranslations();
	const ids = { name: useId(), description: useId(), project: useId(), team: useId(), trigger: useId(), enabled: useId() };
	const [form, setForm] = useState<TaskAutomationForm>(initial);
	const [showErrors, setShowErrors] = useState(false);
	const [seenInitial, setSeenInitial] = useState(initial);
	if (initial !== seenInitial) {
		setSeenInitial(initial);
		setForm(initial);
		setShowErrors(false);
	}
	const errors = useMemo(() => validateTaskAutomationForm(form), [form]);
	const shownErrors = showErrors ? errors : [];
	const patch = (next: Partial<TaskAutomationForm>) => setForm((current) => ({ ...current, ...next }));

	const save = async () => {
		if (errors.length) {
			setShowErrors(true);
			return;
		}
		try {
			await onSave(form);
		} catch (error) {
			toast.error(t('settings.automations.SAVE_FAILED'), { description: t(errorReasonKeyOf(error) as Key) });
		}
	};

	const triggerLabel = (type: ETaskAutomationTrigger) => t(`settings.automations.triggers.${type}` as Key);
	const formErrors = shownErrors.filter((error) => !error.itemKey);

	return (
		<AppDialog open={open} onClose={onClose} width="lg" keepOpenOnOutsideClick>
			<AppDialogHeader
				title={t(mode === 'create' ? 'settings.automations.EDITOR_CREATE_TITLE' : 'settings.automations.EDITOR_EDIT_TITLE')}
				onClose={onClose}
			/>
			<form
				className="flex min-h-0 flex-1 flex-col"
				onSubmit={(event) => {
					event.preventDefault();
					void save();
				}}
			>
				<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-5 pb-5')}>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<label htmlFor={ids.name} className={FIELD_LABEL}>
								{t('settings.automations.NAME')}
							</label>
							<Input
								id={ids.name}
								data-initial-focus
								value={form.name}
								maxLength={TASK_AUTOMATION_LIMITS.nameLength}
								onChange={(event) => patch({ name: event.target.value })}
								placeholder={t('settings.automations.NAME_PLACEHOLDER')}
								aria-invalid={shownErrors.some((error) => error.code.startsWith('NAME')) || undefined}
								className="h-8 text-[13px]"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<label htmlFor={ids.description} className={FIELD_LABEL}>
								{t('settings.automations.DESCRIPTION')}
							</label>
							<textarea
								id={ids.description}
								value={form.description}
								maxLength={TASK_AUTOMATION_LIMITS.descriptionLength}
								onChange={(event) => patch({ description: event.target.value })}
								placeholder={t('settings.automations.DESCRIPTION_PLACEHOLDER')}
								className={TEXTAREA}
							/>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<div className="flex flex-col gap-1">
								<label htmlFor={ids.project} className={FIELD_LABEL}>
									{t('settings.automations.PROJECT')}
								</label>
								<OptionSelect
									id={ids.project}
									options={lookups.projects}
									value={form.projectId}
									onChange={(projectId) => patch({ projectId })}
									placeholder={t('settings.automations.ANY_PROJECT')}
									noneLabel={t('settings.automations.ANY_PROJECT')}
								/>
							</div>
							<div className="flex flex-col gap-1">
								<label htmlFor={ids.team} className={FIELD_LABEL}>
									{t('settings.automations.TEAM')}
								</label>
								<OptionSelect
									id={ids.team}
									options={lookups.teams}
									value={form.organizationTeamId}
									onChange={(organizationTeamId) => patch({ organizationTeamId })}
									placeholder={t('settings.automations.ANY_TEAM')}
									noneLabel={t('settings.automations.ANY_TEAM')}
								/>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<SettingsSwitch
								id={ids.enabled}
								checked={form.isEnabled}
								onCheckedChange={(isEnabled) => patch({ isEnabled })}
								ariaLabel={t('settings.automations.ENABLED_LABEL')}
							/>
							<label htmlFor={ids.enabled} className="text-[13px] text-foreground">
								{t('settings.automations.ENABLED_LABEL')}
							</label>
						</div>
					</div>

					<Block title={t('settings.automations.WHEN')}>
						<label htmlFor={ids.trigger} className="sr-only">
							{t('settings.automations.WHEN')}
						</label>
						<TypeSelect
							id={ids.trigger}
							value={form.trigger}
							values={TASK_AUTOMATION_TRIGGERS}
							labelOf={triggerLabel}
							onChange={(trigger: ETaskAutomationTrigger) => patch({ trigger })}
						/>
						{form.trigger === ETaskAutomationTrigger.LINK_CLOSED && (
							<p className="text-xs text-muted-foreground">{t('settings.automations.NEEDS_INTEGRATION')}</p>
						)}
						{form.trigger === ETaskAutomationTrigger.STATUS_CHANGED && (
							<div className="flex flex-col gap-2">
								<span className={FIELD_LABEL}>{t('settings.automations.TO_STATUSES')}</span>
								<ChipPicker
									options={lookups.statuses}
									value={form.toStatuses}
									onChange={(toStatuses) => patch({ toStatuses })}
									label={t('settings.automations.TO_STATUSES')}
								/>
								<span className={FIELD_LABEL}>{t('settings.automations.FROM_STATUSES')}</span>
								<ChipPicker
									options={lookups.statuses}
									value={form.fromStatuses}
									onChange={(fromStatuses) => patch({ fromStatuses })}
									label={t('settings.automations.FROM_STATUSES')}
								/>
								<p className="text-xs text-muted-foreground">{t('settings.automations.ANY_STATUS')}</p>
							</div>
						)}
					</Block>

					<Block title={t('settings.automations.IF')}>
						{form.conditions.length === 0 && <p className="text-xs text-muted-foreground">{t('settings.automations.NO_CONDITIONS')}</p>}
						{form.conditions.map((condition, index) => (
							<ConditionEditor
								key={condition.key}
								draft={condition}
								lookups={lookups}
								errors={shownErrors}
								onChange={(next) => patch({ conditions: form.conditions.map((one, at) => (at === index ? next : one)) })}
								onRemove={() => patch({ conditions: form.conditions.filter((_, at) => at !== index) })}
							/>
						))}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="self-start"
							disabled={form.conditions.length >= TASK_AUTOMATION_LIMITS.conditionsPerRule}
							onClick={() => patch({ conditions: [...form.conditions, conditionDraftOf()] })}
						>
							<Plus /> {t('settings.automations.ADD_CONDITION')}
						</Button>
					</Block>

					<Block title={t('settings.automations.THEN')}>
						{form.actions.map((action, index) => (
							<ActionEditor
								key={action.key}
								draft={action}
								lookups={lookups}
								errors={shownErrors}
								onChange={(next) => patch({ actions: form.actions.map((one, at) => (at === index ? next : one)) })}
								onRemove={() => patch({ actions: form.actions.filter((_, at) => at !== index) })}
							/>
						))}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="self-start"
							disabled={form.actions.length >= TASK_AUTOMATION_LIMITS.actionsPerRule}
							onClick={() => patch({ actions: [...form.actions, actionDraftOf()] })}
						>
							<Plus /> {t('settings.automations.ADD_ACTION')}
						</Button>
					</Block>
					{formErrors.length > 0 && (
						<p role="alert" className="text-xs text-destructive-ink">
							{formErrors.map((error) => t(`settings.automations.errors.${error.code}` as Key)).join(' ')}
						</p>
					)}
				</div>
				<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
					<Button type="button" variant="ghost" onClick={onClose}>
						{t('settings.automations.CANCEL')}
					</Button>
					<Button type="submit" disabled={isSaving} aria-busy={isSaving || undefined}>
						{t(mode === 'create' ? 'settings.automations.CREATE' : 'settings.automations.SAVE')}
					</Button>
				</div>
			</form>
		</AppDialog>
	);
}
