'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import { type DottedLanguageObjectStringPaths, useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowDown, ArrowUp, History, Pencil, Play, Plus, Trash } from '@/core/components/icons';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import { SETTINGS_ROW_DESCRIPTION, SETTINGS_ROW_LABEL, SettingsPage, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { TeamSettingsGate } from '@/core/components/settings/kit/team-settings-gate';
import {
	useTaskAutomationActions,
	useTaskAutomationRules,
	useTaskAutomationsAvailability
} from '@/core/hooks/task-automations/use-task-automations';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { isTaskAutomationsEnabled } from '@/core/lib/utils/task-automations-enabled';
import {
	emptyTaskAutomationForm,
	formFromRule,
	formFromTemplate,
	moveRuleId,
	ruleInputFromForm,
	type TaskAutomationForm
} from '@/core/lib/utils/task-automations';
import { TASK_AUTOMATION_LIMITS, type ITaskAutomationRule, type ITaskAutomationTemplate } from '@/core/types/interfaces/common/task-automation';
import { AutomationRunsDialog, AutomationTemplateDialog, AutomationTestDialog, useTemplateText } from './automation-dialogs';
import { type AutomationLookups, useAutomationLookups } from './automation-pickers';
import { AutomationRuleEditor } from './automation-rule-editor';
import { AutomationsSettingsSkeleton } from './automations-settings-skeleton';

type Key = DottedLanguageObjectStringPaths;

type EditorState = { mode: 'create' | 'edit'; ruleId: string | null; form: TaskAutomationForm } | null;

function scopeText(rule: ITaskAutomationRule, lookups: AutomationLookups, t: ReturnType<typeof useTranslations>): string {
	const parts: string[] = [];
	if (rule.projectId) parts.push(t('settings.automations.SCOPE_PROJECT', { name: lookups.nameOf(rule.projectId) ?? '—' }));
	if (rule.organizationTeamId) parts.push(t('settings.automations.SCOPE_TEAM', { name: lookups.nameOf(rule.organizationTeamId) ?? '—' }));
	return parts.length ? parts.join(' · ') : t('settings.automations.SCOPE_ORGANIZATION');
}

function RuleRow({
	rule,
	index,
	count,
	lookups,
	busy,
	onToggle,
	onMove,
	onEdit,
	onTest,
	onHistory,
	onDelete
}: Readonly<{
	rule: ITaskAutomationRule;
	index: number;
	count: number;
	lookups: AutomationLookups;
	busy: boolean;
	onToggle: (enabled: boolean) => void;
	onMove: (delta: -1 | 1) => void;
	onEdit: () => void;
	onTest: () => void;
	onHistory: () => void;
	onDelete: () => void;
}>) {
	const t = useTranslations();
	const format = useFormatter();
	const trigger = t(`settings.automations.triggers.${rule.trigger.type}` as Key);
	const lastRun = rule.lastRunAt
		? t('settings.automations.LAST_RUN', { when: format.relativeTime(new Date(rule.lastRunAt)) })
		: t('settings.automations.NEVER_RAN');
	const actions = rule.actions.map((action) => t(`settings.automations.actions.${action.type}` as Key)).join(', ');
	return (
		<li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className={SETTINGS_ROW_LABEL}>{rule.name}</span>
				<span className={SETTINGS_ROW_DESCRIPTION}>
					{trigger} → {actions}
				</span>
				<span className="text-[11px] text-muted-foreground">
					{scopeText(rule, lookups, t)} · {lastRun}
				</span>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-1">
				<Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === 0} onClick={() => onMove(-1)} aria-label={`${t('settings.automations.MOVE_UP')}: ${rule.name}`}>
					<ArrowUp />
				</Button>
				<Button type="button" variant="ghost" size="icon-sm" disabled={busy || index === count - 1} onClick={() => onMove(1)} aria-label={`${t('settings.automations.MOVE_DOWN')}: ${rule.name}`}>
					<ArrowDown />
				</Button>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`${t('settings.automations.EDIT')}: ${rule.name}`}>
					<Pencil />
				</Button>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onTest} aria-label={`${t('settings.automations.TEST')}: ${rule.name}`}>
					<Play />
				</Button>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onHistory} aria-label={`${t('settings.automations.HISTORY')}: ${rule.name}`}>
					<History />
				</Button>
				<Button type="button" variant="ghost" size="icon-sm" onClick={onDelete} aria-label={`${t('settings.automations.DELETE')}: ${rule.name}`} className="text-destructive-ink">
					<Trash />
				</Button>
				<SettingsSwitch checked={rule.isEnabled} onCheckedChange={onToggle} ariaLabel={t('settings.automations.SWITCH_ARIA', { name: rule.name })} className="ml-1" />
			</div>
		</li>
	);
}

function AutomationsManager({ templates }: Readonly<{ templates: ITaskAutomationTemplate[] }>) {
	const t = useTranslations();
	const lookups = useAutomationLookups();
	const textOf = useTemplateText();
	const { rules, isLoading, isError, error, refetch } = useTaskAutomationRules(true);
	const actions = useTaskAutomationActions();
	const [picking, setPicking] = useState(false);
	const [editor, setEditor] = useState<EditorState>(null);
	const [testing, setTesting] = useState<ITaskAutomationRule | null>(null);
	const [history, setHistory] = useState<ITaskAutomationRule | null>(null);
	const [deleting, setDeleting] = useState<ITaskAutomationRule | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const fail = (titleKey: Key, caught: unknown) => toast.error(t(titleKey), { description: t(errorReasonKeyOf(caught) as Key) });

	const pick = (template: ITaskAutomationTemplate | null) => {
		setPicking(false);
		if (!template) {
			setEditor({ mode: 'create', ruleId: null, form: emptyTaskAutomationForm() });
			return;
		}
		const { name, description } = textOf(template);
		setEditor({ mode: 'create', ruleId: null, form: formFromTemplate(template, name, description) });
	};

	const save = async (form: TaskAutomationForm) => {
		const input = ruleInputFromForm(form);
		const started = editor;
		if (started?.mode === 'edit' && started.ruleId) {
			await actions.update(started.ruleId, input);
			toast.success(t('settings.automations.SAVED'));
		} else {
			await actions.create(form.templateKey ? { ...input, templateKey: form.templateKey } : input);
			toast.success(t('settings.automations.CREATED'));
		}
		// Only the editor that saved closes: one opened meanwhile (after a cancel) keeps its unsaved changes.
		setEditor((now) => (now === started ? null : now));
	};

	const move = (rule: ITaskAutomationRule, delta: -1 | 1) => {
		const next = moveRuleId(
			rules.map((one) => one.id),
			rule.id,
			delta
		);
		if (next) actions.reorder(next).catch((caught) => fail('settings.automations.REORDER_FAILED', caught));
	};

	const remove = async () => {
		if (!deleting) return;
		setDeleteError(null);
		try {
			await actions.remove(deleting.id);
			setDeleting(null);
			toast.success(t('settings.automations.DELETED'));
		} catch (caught) {
			setDeleteError(t(errorReasonKeyOf(caught) as Key));
		}
	};

	const full = rules.length >= TASK_AUTOMATION_LIMITS.rulesPerOrganization;
	const newRule = (
		<Button type="button" onClick={() => setPicking(true)} disabled={full}>
			<Plus /> {t('settings.automations.NEW_RULE')}
		</Button>
	);

	return (
		<SettingsPage title={t('settings.entries.automations.TITLE')} description={t('settings.entries.automations.DESCRIPTION')} actions={newRule}>
			<SettingsSection title={t('settings.automations.RULES')} description={t('settings.automations.RULES_DESCRIPTION')}>
				{isLoading && <AutomationsSettingsSkeleton rowsOnly />}
				{isError && (
					<Notice
						tone="error"
						title={t('settings.automations.ERROR_TITLE')}
						description={t(errorReasonKeyOf(error) as Key)}
						actions={
							<Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
								{t('settings.automations.RETRY')}
							</Button>
						}
					/>
				)}
				{!isLoading && !isError && rules.length === 0 && (
					<Notice tone="info" title={t('settings.automations.EMPTY_TITLE')} description={t('settings.automations.EMPTY_DESCRIPTION')} />
				)}
				{rules.length > 0 && (
					<SettingsSurface>
						<ul className="flex flex-col hairline-divide-y divide-border">
							{rules.map((rule, index) => (
								<RuleRow
									key={rule.id}
									rule={rule}
									index={index}
									count={rules.length}
									lookups={lookups}
									busy={actions.isReordering}
									onToggle={(enabled) => actions.setEnabled(rule.id, enabled).catch((caught) => fail('settings.automations.TOGGLE_FAILED', caught))}
									onMove={(delta) => move(rule, delta)}
									onEdit={() => setEditor({ mode: 'edit', ruleId: rule.id, form: formFromRule(rule) })}
									onTest={() => setTesting(rule)}
									onHistory={() => setHistory(rule)}
									onDelete={() => {
										setDeleteError(null);
										setDeleting(rule);
									}}
								/>
							))}
						</ul>
					</SettingsSurface>
				)}
			</SettingsSection>

			<AutomationTemplateDialog open={picking} templates={templates} onClose={() => setPicking(false)} onPick={pick} />
			<AutomationRuleEditor
				open={!!editor}
				mode={editor?.mode ?? 'create'}
				initial={editor?.form ?? EMPTY_FORM}
				lookups={lookups}
				isSaving={actions.isCreating || actions.isUpdating}
				onClose={() => setEditor(null)}
				onSave={save}
			/>
			<AutomationTestDialog rule={testing} lookups={lookups} isTesting={actions.isTesting} onClose={() => setTesting(null)} onTest={actions.test} />
			<AutomationRunsDialog rule={history} lookups={lookups} onClose={() => setHistory(null)} />
			<ConfirmDestructiveDialog
				open={!!deleting}
				onClose={() => setDeleting(null)}
				title={t('settings.automations.DELETE_TITLE')}
				description={t('settings.automations.DELETE_DESCRIPTION')}
				subject={deleting?.name}
				confirmLabel={t('settings.automations.DELETE_CONFIRM')}
				isPending={actions.isRemoving}
				error={deleteError}
				onConfirm={() => void remove()}
			/>
		</SettingsPage>
	);
}

const EMPTY_FORM = emptyTaskAutomationForm();

/** What the page shows before the rules: the switch, the platform's answer, the person's permission. */
function AutomationsSettingsContent() {
	const t = useTranslations();
	const { availability, templates, retry } = useTaskAutomationsAvailability();
	const title = t('settings.entries.automations.TITLE');

	// Off (the default): the page does not exist for this deployment, and nothing was asked of the platform.
	if (availability === 'off') notFound();

	if (availability === 'available') return <AutomationsManager templates={templates} />;
	if (availability === 'loading') return <AutomationsSettingsSkeleton />;
	if (availability === 'forbidden') {
		return (
			<SettingsPage title={title}>
				<Notice tone="warning" title={t('settings.automations.FORBIDDEN_TITLE')} description={t('settings.automations.FORBIDDEN_DESCRIPTION')} />
			</SettingsPage>
		);
	}
	if (availability === 'error') {
		return (
			<SettingsPage title={title}>
				<Notice
					tone="error"
					title={t('settings.automations.ERROR_TITLE')}
					actions={
						<Button type="button" size="sm" variant="outline" onClick={() => void retry()}>
							{t('settings.automations.RETRY')}
						</Button>
					}
				/>
			</SettingsPage>
		);
	}
	return (
		<SettingsPage title={title}>
			<Notice tone="info" title={t('settings.automations.UNAVAILABLE_TITLE')} description={t('settings.automations.UNAVAILABLE_DESCRIPTION')} />
		</SettingsPage>
	);
}

/** Settings → Automations: the organization's task automation rules (managers). */
export function AutomationsSettingsPage() {
	// Off (the default): the page does not exist for this deployment, whoever opens it.
	if (!isTaskAutomationsEnabled()) notFound();
	return (
		<TeamSettingsGate skeleton={<AutomationsSettingsSkeleton />} requiresManager>
			<AutomationsSettingsContent />
		</TeamSettingsGate>
	);
}
