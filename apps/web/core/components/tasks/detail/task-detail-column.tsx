'use client';

import { useTranslations } from 'next-intl';
import { EntityFilesSection } from '@/core/components/common/entity-files/entity-files-section';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { TaskDetailActivity } from './task-detail-activity';
import { TaskDetailDescription } from './task-detail-description';
import { TaskDetailEyebrow } from './task-detail-eyebrow';
import { TaskDetailFacts } from './task-detail-facts';
import { TaskDetailPlans } from './task-detail-plans';
import { TaskDetailProperties } from './task-detail-properties';
import { TaskDetailRelations } from './task-detail-relations';
import { TaskDetailSection } from './task-detail-section';
import { TaskDetailSectionSkeleton } from './task-detail-skeleton';
import { TaskDetailSubtasks } from './task-detail-subtasks';
import { TaskDetailTime } from './task-detail-time';
import { TaskDetailTitle } from './task-detail-title';

interface TaskDetailColumnProps {
	task: TTask;
	/** The full task (children, links, estimations) has arrived, not only its copy from the list. */
	isReady: boolean;
	showsComposer: boolean;
}

export function TaskDetailColumn({ task, isReady, showsComposer }: TaskDetailColumnProps) {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-8 px-6 pt-6 pb-8 sm:px-7">
			<div className="flex flex-col gap-2.5">
				<TaskDetailEyebrow task={task} />
				<TaskDetailTitle task={task} />
			</div>
			<TaskDetailProperties key={task.id} task={task} />
			<TaskDetailDescription task={task} isReady={isReady} />
			{isReady && <TaskDetailSubtasks task={task} />}
			{isReady && <TaskDetailRelations task={task} />}
			{!isReady && <TaskDetailSectionSkeleton />}
			<EntityFilesSection entity="Task" entityId={task.id} />
			<TaskDetailSection title={t('taskDetail.sections.TIME')}>
				<TaskDetailTime task={task} />
			</TaskDetailSection>
			<TaskDetailSection title={t('pages.taskDetails.DAILY_PLANS')}>
				<TaskDetailPlans task={task} />
			</TaskDetailSection>
			<TaskDetailSection title={t('common.DETAILS')}>
				<TaskDetailFacts task={task} />
			</TaskDetailSection>
			<div className="hairline-t border-border pt-6">
				<TaskDetailActivity task={task} showsComposer={showsComposer} />
			</div>
		</div>
	);
}
