'use client';

import { useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/common/button';
import { RadioMark } from '@/core/components/common/radio-mark';
import {
	ACTIVE_TASK_SWITCH_CHOICES,
	useActiveTaskSwitch,
	type ActiveTaskSwitchChoice
} from '@/core/hooks/daily-plans/use-active-task-switch';
import { cn } from '@/core/lib/helpers';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const CHOICE_LABEL_KEYS: Record<ActiveTaskSwitchChoice, DottedLanguageObjectStringPaths> = {
	usePlannedTask: 'dailyPlan.editor.SWITCH_USE_PLANNED',
	addActiveTask: 'dailyPlan.editor.SWITCH_ADD_ACTIVE',
	addActiveTaskAndUsePlannedTask: 'dailyPlan.editor.SWITCH_ADD_AND_USE_PLANNED'
};

const CHOICE_ROW =
	'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hairline-ring ring-border transition-[background-color,box-shadow] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/25';

interface ActiveTaskSwitchPanelProps {
	plannedTask: TTask | null;
	/** Runs once the choice is applied, or when the person skips: the caller closes and starts the timer. */
	onFinish: () => void;
}

/**
 * The step shown when the timer would start on a plan that does not hold the active task: work on the planned task,
 * add the active one to today's plan, or both. Skipping keeps the active task.
 */
export function ActiveTaskSwitchPanel({ plannedTask, onFinish }: Readonly<ActiveTaskSwitchPanelProps>) {
	const t = useTranslations();
	const { activeTask, applyChoice } = useActiveTaskSwitch(plannedTask);
	const [choice, setChoice] = useState<ActiveTaskSwitchChoice | null>(null);
	const [isApplying, setIsApplying] = useState(false);

	const submit = async () => {
		if (choice) {
			setIsApplying(true);
			await applyChoice(choice);
			setIsApplying(false);
		}
		onFinish();
	};

	return (
		<>
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pt-1 pb-5')}>
				<p className="text-[13px] leading-relaxed text-muted-foreground">
					{t('dailyPlan.chang_active_task_popup.MESSAGE', {
						defaultPlannedTask: plannedTask?.taskNumber ?? '',
						activeTask: activeTask?.taskNumber ?? ''
					})}
				</p>
				<fieldset className="flex flex-col gap-1.5">
					<legend className="sr-only">{t('dailyPlan.chang_active_task_popup.TITLE')}</legend>
					{ACTIVE_TASK_SWITCH_CHOICES.map((value) => {
						const isChecked = value === choice;
						return (
							<label
								key={value}
								className={cn(
									CHOICE_ROW,
									isChecked && 'bg-primary/[0.04] ring-primary/30',
									!isChecked && 'hover:bg-foreground/[0.025]'
								)}
							>
								<input
									type="radio"
									name="active-task-switch"
									value={value}
									checked={isChecked}
									onChange={() => setChoice(value)}
									className="sr-only"
								/>
								<RadioMark isChecked={isChecked} />
								<span className="text-[13px] text-foreground">{t(CHOICE_LABEL_KEYS[value])}</span>
							</label>
						);
					})}
				</fieldset>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				<Button
					type="button"
					variant="ghost"
					size="default"
					onClick={onFinish}
					disabled={isApplying}
					className="ml-auto"
				>
					{t('common.SKIP_ADD_LATER')}
				</Button>
				<Button type="button" size="default" onClick={() => void submit()} loading={isApplying}>
					{t('timer.todayPlanSettings.START_WORKING_BUTTON')}
				</Button>
			</div>
		</>
	);
}
