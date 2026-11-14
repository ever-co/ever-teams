'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Circle, CircleCheck, CircleX, Spinner } from '@/core/components/icons';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import type { WorkspaceCreationState } from '@/core/hooks/timesheet/use-workspace-import';
import type { WorkspaceImportPlan } from '@/core/lib/utils/workspace-import-plan';
import {
	WORKSPACE_STEPS,
	workspaceStepStatusesOf,
	type WorkspaceStep,
	type WorkspaceStepStatus
} from '@/core/lib/utils/workspace-import-run';
import { FILE_NAME_TEXT } from './time-import-copy';

const STEP_LABEL_KEYS: Readonly<Record<WorkspaceStep, DottedLanguageObjectStringPaths>> = {
	clients: 'timeImport.workspace.figures.CLIENTS',
	projects: 'timeImport.workspace.figures.PROJECTS',
	labels: 'timeImport.workspace.figures.LABELS'
};

const STATUS_KEYS: Readonly<Record<WorkspaceStepStatus, DottedLanguageObjectStringPaths>> = {
	waiting: 'timeImport.workspace.status.waiting',
	running: 'timeImport.workspace.status.running',
	done: 'timeImport.workspace.status.done',
	failed: 'timeImport.workspace.status.failed'
};

const STATUS_BADGES: Readonly<Record<WorkspaceStepStatus, BadgeProps['variant']>> = {
	waiting: 'secondary',
	running: 'info',
	done: 'success',
	failed: 'destructive'
};

function StepGlyph({ status }: Readonly<{ status: WorkspaceStepStatus }>) {
	if (status === 'running') {
		return <Spinner aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />;
	}
	if (status === 'done') {
		return <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success-foreground" />;
	}
	if (status === 'failed') {
		return <CircleX aria-hidden="true" className="size-4 shrink-0 text-destructive-ink" />;
	}
	return <Circle aria-hidden="true" className="size-4 shrink-0 text-muted-foreground/60" />;
}

interface WorkspaceImportProgressProps {
	plan: WorkspaceImportPlan;
	creation: WorkspaceCreationState;
	/** Whether entries are saved after the lists: their own progress then follows below. */
	hasEntries: boolean;
	onReset: () => void;
}

/** The clients, projects and labels of an import as they are created, step by step, and how the run ended. */
export function WorkspaceImportProgress({ plan, creation, hasEntries, onReset }: Readonly<WorkspaceImportProgressProps>) {
	const t = useTranslations();
	const statuses = workspaceStepStatusesOf(plan, creation);
	const { tallies, failure } = creation;
	const isCreating = creation.status === 'creating';
	const isListsOnlyDone = creation.status === 'created' && !hasEntries;

	let description: string | undefined = undefined;
	if (isCreating) {
		description = t('timeImport.KEEP_OPEN');
	}

	return (
		<SettingsSection
			id="workspace-import-progress"
			title={t('timeImport.workspace.PROGRESS_TITLE')}
			description={description}
		>
			{failure && (
				<Notice
					tone="error"
					title={
						<span className={FILE_NAME_TEXT}>
							{t('timeImport.workspace.FAILED_TITLE', { name: failure.name })}
						</span>
					}
					description={`${t(failure.reasonKey as DottedLanguageObjectStringPaths)} ${t('timeImport.workspace.FAILED_DESCRIPTION')}`}
					actions={
						<Button type="button" variant="outline" onClick={onReset}>
							{t('timeImport.workspace.CHOOSE_OTHER')}
						</Button>
					}
				/>
			)}
			{isListsOnlyDone && (
				<Notice
					tone="success"
					title={t('timeImport.workspace.CREATED_TITLE')}
					actions={
						<Button type="button" onClick={onReset}>
							{t('timeImport.IMPORT_ANOTHER')}
						</Button>
					}
				/>
			)}
			<SettingsSurface>
				<ul className="flex flex-col hairline-divide-y divide-border" aria-busy={isCreating}>
					{WORKSPACE_STEPS.map((step) => {
						const status = statuses[step];
						const tally = tallies?.[step];
						const created = tally?.created ?? 0;
						const reused = tally?.reused ?? plan[step].reuse.length;
						const failed = tally?.failed ?? 0;
						const skipped = tally?.skipped ?? 0;
						return (
							<li key={step} className="flex min-h-14 items-center gap-3 px-4 py-3">
								<StepGlyph status={status} />
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="text-[13px] font-medium text-foreground">
										{t(STEP_LABEL_KEYS[step])}
									</span>
									<span className="text-xs tabular-nums text-muted-foreground">
										{t('timeImport.workspace.STEP_COUNTS', { created, reused, failed })}
									</span>
									{skipped > 0 && (
										<span className="text-xs tabular-nums text-muted-foreground">
											{t('timeImport.workspace.STEP_SKIPPED', { count: skipped })}
										</span>
									)}
								</span>
								<Badge variant={STATUS_BADGES[status]}>{t(STATUS_KEYS[status])}</Badge>
							</li>
						);
					})}
				</ul>
			</SettingsSurface>
		</SettingsSection>
	);
}
