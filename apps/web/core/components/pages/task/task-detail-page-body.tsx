'use client';

import { useTranslations } from 'next-intl';
import { EntityFilesSection } from '@/core/components/common/entity-files/entity-files-section';
import { TaskDetailActivity } from '@/core/components/tasks/detail/task-detail-activity';
import { TaskDetailDescription } from '@/core/components/tasks/detail/task-detail-description';
import { TaskDetailByline, TaskDetailFacts } from '@/core/components/tasks/detail/task-detail-facts';
import { TaskDetailHostProvider } from '@/core/components/tasks/detail/task-detail-host';
import { TaskDetailPlans } from '@/core/components/tasks/detail/task-detail-plans';
import { TaskDetailProperties } from '@/core/components/tasks/detail/task-detail-properties';
import { TaskDetailRelations } from '@/core/components/tasks/detail/task-detail-relations';
import { TaskDetailRailSection, TaskDetailSection } from '@/core/components/tasks/detail/task-detail-section';
import { TaskDetailSubtasks } from '@/core/components/tasks/detail/task-detail-subtasks';
import { TaskDetailTime } from '@/core/components/tasks/detail/task-detail-time';
import { TaskDetailTimesheet } from '@/core/components/tasks/detail/task-detail-timesheet';
import { TaskDetailTitle } from '@/core/components/tasks/detail/task-detail-title';
import { useMediaQuery } from '@/core/hooks/common/use-media-query';
import type { TTask } from '@/core/types/schemas/task/task.schema';

const WIDE_LAYOUT_QUERY = '(min-width: 1024px)';

function TimePlansAndFacts({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	return (
		<>
			<TaskDetailSection title={t('taskDetail.sections.TIME')}>
				<TaskDetailTime task={task} />
			</TaskDetailSection>
			<TaskDetailSection title={t('pages.taskDetails.DAILY_PLANS')}>
				<TaskDetailPlans task={task} />
			</TaskDetailSection>
			<TaskDetailSection title={t('common.DETAILS')}>
				<TaskDetailFacts task={task} />
			</TaskDetailSection>
		</>
	);
}

function TaskDetailRail({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	return (
		<aside
			aria-label={t('common.DETAILS')}
			className="custom-scrollbar w-[20rem] shrink-0 overflow-y-auto hairline-l border-border hairline-divide-y divide-border xl:w-[22rem]"
		>
			<TaskDetailRailSection title={t('taskDetail.sections.PROPERTIES')}>
				<TaskDetailProperties key={task.id} task={task} columns="one" />
			</TaskDetailRailSection>
			<TaskDetailRailSection title={t('taskDetail.sections.TIME')}>
				<TaskDetailTime task={task} />
			</TaskDetailRailSection>
			<TaskDetailRailSection title={t('pages.taskDetails.DAILY_PLANS')}>
				<TaskDetailPlans task={task} />
			</TaskDetailRailSection>
			<TaskDetailRailSection title={t('common.DETAILS')}>
				<TaskDetailFacts task={task} />
			</TaskDetailRailSection>
		</aside>
	);
}

export function TaskDetailPageBody({ task }: Readonly<{ task: TTask }>) {
	const isWide = useMediaQuery(WIDE_LAYOUT_QUERY);
	return (
		<TaskDetailHostProvider host="page">
			<div className="absolute inset-0 flex">
				<div className="custom-scrollbar min-w-0 flex-1 overflow-y-auto">
					<div className="mx-auto flex w-full max-w-[46rem] flex-col gap-8 px-5 py-8 sm:px-8">
						<div className="flex flex-col gap-2">
							<TaskDetailTitle task={task} />
							<TaskDetailByline task={task} />
						</div>
						{!isWide && <TaskDetailProperties key={task.id} task={task} />}
						<TaskDetailDescription task={task} surface="plain" />
						<TaskDetailSubtasks task={task} />
						<TaskDetailRelations task={task} />
						<EntityFilesSection entity="Task" entityId={task.id} />
						{!isWide && <TimePlansAndFacts task={task} />}
						<TaskDetailTimesheet taskId={task.id} />
						<div className="hairline-t border-border pt-6">
							<TaskDetailActivity task={task} showsComposer={true} />
						</div>
					</div>
				</div>
				{isWide && <TaskDetailRail task={task} />}
			</div>
		</TaskDetailHostProvider>
	);
}
