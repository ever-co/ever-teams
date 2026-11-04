'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { I_UserProfilePage, useModal } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Button, SpinnerLoader } from '@/core/components';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { Plus } from '@/core/components/icons';
import { TaskUnOrAssignPopover } from '@/core/components/features/tasks/task-assign-popover';
import { AddManualTimeModalSkeleton } from '@/core/components/common/skeleton/calendar-component-skeletons';
import { LazyAddManualTimeModal } from '@/core/components/optimized-components';
import type { I_TaskFilter } from './task-filters';

const ASSIGN_TASK_SHORTCUT = 'A';

const PHONE_ACTION = 'max-md:flex-1';

/**
 * What a viewer does about the person: log time by hand and give them a task. The assign popover renders the only
 * button, dressed as the primary action; `border-solid` restores the inner line its `border-none` base removes.
 */
export function ProfileActions({ hook, profile }: Readonly<{ hook: I_TaskFilter; profile: I_UserProfilePage }>) {
	const t = useTranslations();
	const [isAssigning, setIsAssigning] = useState(false);
	const manualTimeModal = useModal();
	const memberEmployeeId = profile.member?.employeeId;

	let usersTaskCreatedAssignTo: { id: string }[] | undefined;
	if (memberEmployeeId) {
		usersTaskCreatedAssignTo = [{ id: memberEmployeeId }];
	}

	const assignTaskButtonClassName = clsxm(
		buttonVariants({ variant: 'default', size: 'default' }),
		'mb-0 w-full min-w-fit shrink-0 whitespace-nowrap border-solid',
		isAssigning && 'pointer-events-none opacity-50'
	);

	return (
		<div className="flex shrink-0 items-center gap-2 max-md:w-full">
			<Button
				variant="outline"
				size="default"
				onClick={manualTimeModal.openModal}
				className={clsxm('min-w-fit shrink-0 whitespace-nowrap', PHONE_ACTION)}
			>
				<Plus />
				{t('common.ADD_TIME')}
			</Button>

			<Tooltip label={ASSIGN_TASK_SHORTCUT} placement="auto" className={PHONE_ACTION}>
				<TaskUnOrAssignPopover
					onTaskClick={(task, close) => {
						setIsAssigning(true);
						close();
						profile.assignTask(task).finally(() => setIsAssigning(false));
					}}
					tasks={hook.tasksGrouped.unassignedTasks}
					buttonClassName={assignTaskButtonClassName}
					onTaskCreated={(_, close) => close()}
					usersTaskCreatedAssignTo={usersTaskCreatedAssignTo}
					userProfile={profile.member}
				>
					{isAssigning && <SpinnerLoader size={16} variant="light" />}
					<span>{t('common.ASSIGN_TASK')}</span>
				</TaskUnOrAssignPopover>
			</Tooltip>

			{manualTimeModal.isOpen && (
				<Suspense fallback={<AddManualTimeModalSkeleton />}>
					<LazyAddManualTimeModal
						closeModal={manualTimeModal.closeModal}
						isOpen={manualTimeModal.isOpen}
						params="AddTime"
					/>
				</Suspense>
			)}
		</div>
	);
}
