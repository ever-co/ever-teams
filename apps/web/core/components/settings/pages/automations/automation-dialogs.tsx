'use client';

import { useId, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useFormatter, useTranslations } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER, AppDialog, AppDialogDescription, AppDialogHeader } from '@/core/components/common/app-dialog';
import { Badge } from '@/core/components/common/badge';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronRight, Plus } from '@/core/components/icons';
import { useTaskAutomationRuns } from '@/core/hooks/task-automations/use-task-automations';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { changeValueText, outcomeToneOf, type TaskAutomationOutcomeTone } from '@/core/lib/utils/task-automations';
import {
	ETaskAutomationAction,
	type ETaskAutomationRunOutcome,
	type ITaskAutomationChange,
	type ITaskAutomationConditionResult,
	type ITaskAutomationRule,
	type ITaskAutomationTemplate,
	type ITaskAutomationTestResult
} from '@/core/types/interfaces/common/task-automation';
import { type AutomationLookups, OptionSelect } from './automation-pickers';

type Key = DottedLanguageObjectStringPaths;

const BADGE_OF_TONE: Record<TaskAutomationOutcomeTone, 'success' | 'warning' | 'destructive' | 'secondary'> = {
	success: 'success',
	warning: 'warning',
	danger: 'destructive',
	neutral: 'secondary'
};

export function OutcomeBadge({ outcome }: Readonly<{ outcome: ETaskAutomationRunOutcome }>) {
	const t = useTranslations();
	return <Badge variant={BADGE_OF_TONE[outcomeToneOf(outcome)]}>{t(`settings.automations.outcomes.${outcome}` as Key)}</Badge>;
}

/** A template's name and description as the app shows them (translated by key; the platform's English otherwise). */
export function useTemplateText() {
	const t = useTranslations();
	return (template: ITaskAutomationTemplate) => {
		const base = `settings.automations.templates.${template.key}`;
		const name = t.has(`${base}.NAME` as Key) ? t(`${base}.NAME` as Key) : template.name;
		const description = t.has(`${base}.DESCRIPTION` as Key) ? t(`${base}.DESCRIPTION` as Key) : template.description;
		return { name, description };
	};
}

/** "New rule": a template, or a blank rule. */
export function AutomationTemplateDialog({
	open,
	templates,
	onClose,
	onPick
}: Readonly<{ open: boolean; templates: ITaskAutomationTemplate[]; onClose: () => void; onPick: (template: ITaskAutomationTemplate | null) => void }>) {
	const t = useTranslations();
	const textOf = useTemplateText();
	const row =
		'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:bg-foreground/[0.06]';
	return (
		<AppDialog open={open} onClose={onClose} width="md">
			<AppDialogHeader title={t('settings.automations.CHOOSE_TEMPLATE')} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-1 pb-4')}>
				<button type="button" className={row} onClick={() => onPick(null)} data-initial-focus>
					<span className="flex size-8 shrink-0 items-center justify-center rounded-lg keycap-3d text-foreground/70">
						<Plus className="size-4" />
					</span>
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="text-[13px] font-medium text-foreground">{t('settings.automations.BLANK_RULE')}</span>
						<span className="text-xs text-muted-foreground">{t('settings.automations.BLANK_RULE_DESCRIPTION')}</span>
					</span>
					<ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
				</button>
				<p className="mt-2 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t('settings.automations.FROM_TEMPLATE')}</p>
				{templates.map((template) => {
					const { name, description } = textOf(template);
					return (
						<button key={template.key} type="button" className={row} onClick={() => onPick(template)}>
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="text-[13px] font-medium text-foreground">{name}</span>
								<span className="text-xs text-pretty text-muted-foreground">{description}</span>
								{template.requiresIntegration && (
									<span className="text-xs text-pretty text-warning-foreground">{t('settings.automations.NEEDS_INTEGRATION')}</span>
								)}
							</span>
							<ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
						</button>
					);
				})}
			</div>
		</AppDialog>
	);
}

function ChangeLine({ change, lookups }: Readonly<{ change: ITaskAutomationChange; lookups: AutomationLookups }>) {
	const t = useTranslations();
	const action = t(`settings.automations.actions.${change.action}` as Key);
	let text: string;
	if (change.action === ETaskAutomationAction.NOTIFY_ASSIGNEES) {
		text = typeof change.to === 'number' ? t('settings.automations.NOTICE_LINE', { count: change.to }) : action;
	} else {
		text = t('settings.automations.CHANGE_LINE', {
			from: changeValueText(change.from, lookups.nameOf),
			to: changeValueText(change.to, lookups.nameOf)
		});
	}
	return (
		<li className="flex flex-col gap-0.5 py-1.5">
			<span className={cn('text-[13px]', change.failed ? 'text-destructive-ink' : 'text-foreground')}>
				<span className="font-medium">{action}</span> · {text}
			</span>
			{change.note && <span className="text-xs text-muted-foreground">{change.note}</span>}
		</li>
	);
}

function ConditionLines({ conditions }: Readonly<{ conditions: ITaskAutomationConditionResult[] }>) {
	const t = useTranslations();
	if (!conditions.length) return <p className="text-xs text-muted-foreground">{t('settings.automations.NO_CONDITIONS')}</p>;
	return (
		<ul className="flex flex-col">
			{conditions.map((condition, index) => (
				<li key={`${condition.type}-${index}`} className="flex items-center justify-between gap-3 py-1 text-[13px]">
					<span className="text-foreground">{t(`settings.automations.conditions.${condition.type}` as Key)}</span>
					<Badge variant={condition.passed ? 'success' : 'secondary'}>
						{t(condition.passed ? 'settings.automations.PASSED' : 'settings.automations.NOT_PASSED')}
					</Badge>
				</li>
			))}
		</ul>
	);
}

function triggerText(result: ITaskAutomationTestResult, t: ReturnType<typeof useTranslations>): string {
	if (result.triggerMatches === true) return t('settings.automations.TRIGGER_MATCHES');
	if (result.triggerMatches === false) return t('settings.automations.TRIGGER_NOT_MATCH');
	return t('settings.automations.TRIGGER_EVENT');
}

/** The dry run: pick a task of the team, see what the rule would do; nothing is changed. */
export function AutomationTestDialog({
	rule,
	lookups,
	isTesting,
	onClose,
	onTest
}: Readonly<{
	rule: ITaskAutomationRule | null;
	lookups: AutomationLookups;
	isTesting: boolean;
	onClose: () => void;
	onTest: (ruleId: string, taskId: string) => Promise<ITaskAutomationTestResult>;
}>) {
	const t = useTranslations();
	const taskId = useId();
	const [picked, setPicked] = useState<string | null>(null);
	const [result, setResult] = useState<ITaskAutomationTestResult | null>(null);
	const [error, setError] = useState<unknown>(null);
	const [shownRule, setShownRule] = useState(rule);
	if (rule !== shownRule) {
		setShownRule(rule);
		setPicked(null);
		setResult(null);
		setError(null);
	}
	const run = async () => {
		if (!rule || !picked) return;
		setError(null);
		try {
			setResult(await onTest(rule.id, picked));
		} catch (caught) {
			setResult(null);
			setError(caught);
		}
	};
	const onParent = result?.subjectTaskId && result.subjectTaskId !== result.taskId;
	return (
		<AppDialog open={!!rule} onClose={onClose} width="md">
			<AppDialogHeader title={t('settings.automations.TEST_TITLE', { name: rule?.name ?? '' })} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pb-4')}>
				<AppDialogDescription>{t('settings.automations.TEST_DESCRIPTION')}</AppDialogDescription>
				{lookups.tasks.length === 0 ? (
					<p className="text-[13px] text-muted-foreground">{t('settings.automations.NO_TASKS')}</p>
				) : (
					<div className="flex flex-col gap-1">
						<label htmlFor={taskId} className="text-xs font-medium text-muted-foreground">
							{t('settings.automations.TEST_TASK')}
						</label>
						<OptionSelect id={taskId} options={lookups.tasks} value={picked} onChange={setPicked} placeholder={t('settings.automations.TEST_TASK')} />
					</div>
				)}
				{error !== null && (
					<p role="alert" className="text-[13px] text-destructive-ink">
						{t('settings.automations.TEST_FAILED')} · {t(errorReasonKeyOf(error) as Key)}
					</p>
				)}
				{result && (
					<div className="flex flex-col gap-3" aria-live="polite">
						<section className="flex flex-col gap-1">
							<h3 className="text-xs font-semibold text-muted-foreground">{t('settings.automations.TEST_TRIGGER')}</h3>
							<p className="text-[13px] text-foreground">{triggerText(result, t)}</p>
							{result.triggerNote && <p className="text-xs text-muted-foreground">{result.triggerNote}</p>}
							{onParent && <p className="text-xs text-muted-foreground">{t('settings.automations.ON_PARENT')}</p>}
						</section>
						<section className="flex flex-col gap-1">
							<h3 className="text-xs font-semibold text-muted-foreground">{t('settings.automations.TEST_CONDITIONS')}</h3>
							<ConditionLines conditions={result.conditions} />
						</section>
						<section className="flex flex-col gap-1">
							<h3 className="text-xs font-semibold text-muted-foreground">{t('settings.automations.TEST_CHANGES')}</h3>
							<ul className="flex flex-col hairline-divide-y divide-border">
								{result.changes.map((change, index) => (
									<ChangeLine key={`${change.action}-${index}`} change={change} lookups={lookups} />
								))}
							</ul>
						</section>
						<section className="flex items-center justify-between gap-3">
							<h3 className="text-xs font-semibold text-muted-foreground">{t('settings.automations.TEST_OUTCOME')}</h3>
							<OutcomeBadge outcome={result.outcome} />
						</section>
					</div>
				)}
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="ghost" onClick={onClose}>
					{t('settings.automations.CANCEL')}
				</Button>
				<Button type="button" onClick={() => void run()} disabled={!picked || isTesting} aria-busy={isTesting || undefined}>
					{t('settings.automations.TEST_RUN')}
				</Button>
			</div>
		</AppDialog>
	);
}

/** A rule's last runs, newest first. */
export function AutomationRunsDialog({
	rule,
	lookups,
	onClose
}: Readonly<{ rule: ITaskAutomationRule | null; lookups: AutomationLookups; onClose: () => void }>) {
	const t = useTranslations();
	const format = useFormatter();
	const runs = useTaskAutomationRuns(rule?.id ?? null);
	const items = runs.data ?? [];
	return (
		<AppDialog open={!!rule} onClose={onClose} width="md">
			<AppDialogHeader title={t('settings.automations.HISTORY_TITLE', { name: rule?.name ?? '' })} onClose={onClose} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-2 pb-4')}>
				{runs.isLoading && <p className="text-[13px] text-muted-foreground">{t('settings.automations.LOADING')}</p>}
				{runs.isError && (
					<p role="alert" className="text-[13px] text-destructive-ink">
						{t('settings.automations.HISTORY_FAILED')} · {t(errorReasonKeyOf(runs.error) as Key)}
					</p>
				)}
				{!runs.isLoading && !runs.isError && items.length === 0 && (
					<p className="text-[13px] text-muted-foreground">{t('settings.automations.HISTORY_EMPTY')}</p>
				)}
				<ul className="flex flex-col hairline-divide-y divide-border">
					{items.map((run) => {
						const taskName = run.taskId ? (lookups.nameOf(run.taskId) ?? run.taskId) : '—';
						const when = run.createdAt ? format.relativeTime(new Date(run.createdAt)) : '';
						return (
							<li key={run.id} className="flex flex-col gap-1 py-2.5">
								<div className="flex items-center justify-between gap-3">
									<span className="min-w-0 truncate text-[13px] font-medium text-foreground">{taskName}</span>
									<OutcomeBadge outcome={run.outcome} />
								</div>
								<span className="text-xs text-muted-foreground">
									{[when, run.depth > 0 ? t('settings.automations.HISTORY_DEPTH') : null].filter(Boolean).join(' · ')}
								</span>
								{(run.details?.changes ?? [])
									.filter((change) => !change.note || change.failed)
									.map((change, index) => (
										<ul key={`${run.id}-${index}`}>
											<ChangeLine change={change} lookups={lookups} />
										</ul>
									))}
								{run.details?.note && <span className="text-xs text-muted-foreground">{run.details.note}</span>}
								{run.error && <span className="text-xs text-destructive-ink">{run.error}</span>}
							</li>
						);
					})}
				</ul>
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="ghost" onClick={() => void runs.refetch()}>
					{t('settings.automations.REFRESH')}
				</Button>
				<Button type="button" variant="outline" onClick={onClose}>
					{t('settings.automations.CLOSE')}
				</Button>
			</div>
		</AppDialog>
	);
}
