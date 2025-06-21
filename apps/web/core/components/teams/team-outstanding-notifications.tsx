'use client';
import { useAuthenticateUser } from '@/core/hooks';
import { Cross2Icon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';
import { HAS_VISITED_OUTSTANDING_TASKS } from '@/core/constants/config/constants';
import moment from 'moment';
import { Tooltip } from '../duplicated-components/tooltip';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { TUser } from '@/core/types/schemas';
import { ETaskStatusName } from '@/core/types/generics/enums/task';

interface IEmployeeWithOutstanding {
	employeeId: string | undefined;
	employee: IEmployee | undefined;
}

export function TeamOutstandingNotifications({
	outstandingPlans,
	dailyPlan,
	isTeamManager,
	user
}: {
	outstandingPlans: IDailyPlan[];
	dailyPlan: { items: IDailyPlan[] };
	isTeamManager: boolean;
	user: TUser | null;
}) {
	return (
		<div className="flex flex-col gap-1">
			{outstandingPlans.length > 0 && (
				<UserOutstandingNotification outstandingPlans={outstandingPlans} user={user} />
			)}

			{dailyPlan.items && dailyPlan.items.length > 0 && isTeamManager && (
				<ManagerOutstandingUsersNotification outstandingTasks={dailyPlan.items} />
			)}
		</div>
	);
}

const UserOutstandingNotification = memo(function UserOutstandingNotification({
	outstandingPlans,
	user
}: {
	outstandingPlans: IDailyPlan[];
	user?: TUser | null;
}) {
	const t = useTranslations();

	// Notification will be displayed by next day

	const name = user?.name || user?.firstName || user?.lastName || user?.username;

	const [visible, setVisible] = useState(false);

	const outStandingTasksCount = useMemo(() => {
		// Fixed version: Filter out undefined/null tasks before processing
		const validTasks = outstandingPlans.flatMap((plan) => plan.tasks || []).filter((task) => task && task.id);

		console.log('🔍 UserOutstandingNotification Debug:', {
			outstandingPlans: outstandingPlans.length,
			totalValidTasks: validTasks.length,
			validTasks: validTasks.map((task) => ({ id: task.id, status: task.status }))
		});

		// Count unique tasks (same logic as estimatedTotalTime but safer)
		const uniqueTaskIds = new Set(validTasks.map((task) => task.id));
		const totalTasks = uniqueTaskIds.size;

		console.log('🔍 Final count:', totalTasks);
		return totalTasks;
	}, [outstandingPlans]);

	const lastVisited = window?.localStorage.getItem(HAS_VISITED_OUTSTANDING_TASKS);

	useEffect(() => {
		// TEMPORARY: Force visibility for testing conditional rendering optimization
		setVisible(true);

		// Original logic (commented for testing):
		// if (lastVisited == new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]) {
		// 	setVisible(false);
		// } else {
		// 	setVisible(true);
		// 	if (!lastVisited) {
		// 		window?.localStorage.setItem(
		// 			HAS_VISITED_OUTSTANDING_TASKS,
		// 			new Date(moment().subtract(1, 'days').format('YYYY-MM-DD')).toISOString().split('T')[0]
		// 		);
		// 	}
		// }

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClose = () => {
		window.localStorage.setItem(
			HAS_VISITED_OUTSTANDING_TASKS,
			new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]
		);
		setVisible(false);
	};

	return (
		<>
			{visible && outStandingTasksCount > 0 && (
				<div className="flex justify-between items-center px-4 py-2 text-xs rounded-xl border dark:border-dark--theme-light">
					<div>
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {outStandingTasksCount}{' '}
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.USER_LABEL')}{' '}
						<span className="font-medium">
							{t('pages.home.OUTSTANDING_NOTIFICATIONS.OUTSTANDING_VIEW')}
						</span>
					</div>
					<div className="flex gap-5 items-center">
						<div>
							<Link
								href={`/profile/${user?.id}?name=${name || ''}`}
								className="flex gap-2 items-center px-2.5 py-1 text-white rounded-xl bg-primary"
								onClick={() => {
									onClose();
									window && window.localStorage.setItem('task-tab', 'dailyplan');
									window && window.localStorage.setItem('daily-plan-tab', 'Outstanding');
								}}
							>
								<EyeOpenIcon />
								<span>{t('pages.home.OUTSTANDING_NOTIFICATIONS.VIEW_BUTTON')}</span>
							</Link>
						</div>
						<Tooltip label={t('common.CLOSE')}>
							<Cross2Icon className="text-xl cursor-pointer" onClick={onClose} />
						</Tooltip>
					</div>
				</div>
			)}
		</>
	);
});

const ManagerOutstandingUsersNotification = memo(function ManagerOutstandingUsersNotification({
	outstandingTasks
}: {
	outstandingTasks: IDailyPlan[];
}) {
	const { user } = useAuthenticateUser();
	const t = useTranslations();

	// Notification will be displayed by next day

	const [visible, setVisible] = useState(false);

	const employeeWithOutstanding = useMemo(
		() =>
			outstandingTasks

				.filter((plan) => {
					if (plan.employeeId === user?.employee?.id) return false;
					if (!plan.date) return false;

					const isTodayOrBefore = moment(plan.date).isSameOrBefore(moment().endOf('day'));
					if (!isTodayOrBefore) return false;

					const hasIncompleteTasks = plan.tasks?.some((task) => task.status !== ETaskStatusName.COMPLETED);
					return hasIncompleteTasks;
				})
				.map((plan) => ({ employeeId: plan.employeeId, employee: plan.employee })),
		[outstandingTasks, user?.employee?.id]
	);

	const uniqueEmployees: IEmployeeWithOutstanding[] = employeeWithOutstanding.reduce(
		(acc: IEmployeeWithOutstanding[], current) => {
			const existingEmployee = acc.find((emp) => emp.employeeId === current.employeeId);

			if (!existingEmployee) {
				acc.push({
					employeeId: current.employeeId,
					employee: current.employee
				});
			}

			return acc;
		},
		[]
	);

	const lastVisited = window?.localStorage.getItem(HAS_VISITED_OUTSTANDING_TASKS);

	useEffect(() => {
		// TEMPORARY: Force visibility for testing conditional rendering optimization
		setVisible(true);

		// Original logic (commented for testing):
		// if (lastVisited == new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]) {
		// 	setVisible(false);
		// } else {
		// 	setVisible(true);
		// 	if (!lastVisited) {
		// 		window?.localStorage.setItem(
		// 			HAS_VISITED_OUTSTANDING_TASKS,
		// 			new Date(moment().subtract(1, 'days').format('YYYY-MM-DD')).toISOString().split('T')[0]
		// 		);
		// 	}
		// }

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClose = () => {
		window.localStorage.setItem(
			HAS_VISITED_OUTSTANDING_TASKS,
			new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]
		);
		setVisible(false);
	};
	return (
		<>
			{uniqueEmployees?.length > 0 && visible && (
				<div className="flex justify-between items-center px-4 py-2.5 mb-2 text-xs rounded-xl border dark:border-dark--theme-light">
					<div>
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {uniqueEmployees?.length} team member(s)
						with uncompleted tasks, please see{' '}
						<span>
							{uniqueEmployees?.map((em) => (
								<Link
									href={`/profile/${em.employee?.user?.id}?name=${em.employee?.user?.name || em.employee?.user?.firstName || em.employee?.user?.lastName || em.employee?.user?.username}`}
									key={em.employeeId}
									className="font-semibold underline text-primary"
								>
									{em.employee?.fullName},{' '}
								</Link>
							))}
						</span>
					</div>
					<div className="flex gap-5 items-center">
						<Tooltip label={t('common.CLOSE')}>
							<Cross2Icon className="text-xl cursor-pointer" onClick={onClose} />
						</Tooltip>
					</div>
				</div>
			)}
		</>
	);
});
