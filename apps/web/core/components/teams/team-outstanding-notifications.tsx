'use client';
import { useAuthenticateUser, useDailyPlan } from '@/core/hooks';
import { IDailyPlan, IEmployee, IUser } from '@/core/types/interfaces/to-review';
import { Cross2Icon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { memo, useEffect, useMemo, useState } from 'react';
import { estimatedTotalTime } from '../tasks/daily-plan';
import { HAS_VISITED_OUTSTANDING_TASKS } from '@/core/constants/config/constants';
import moment from 'moment';
import { Tooltip } from '../duplicated-components/tooltip';

interface IEmployeeWithOutstanding {
	employeeId: string | undefined;
	employee: IEmployee | undefined;
}

export function TeamOutstandingNotifications() {
	const { dailyPlan, outstandingPlans } = useDailyPlan();
	const { isTeamManager, user } = useAuthenticateUser();

	return (
		<div className="flex flex-col gap-4">
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
	user?: IUser;
}) {
	const t = useTranslations();

	// Notification will be displayed by next day

	const name = user?.name || user?.firstName || user?.lastName || user?.username;

	const [visible, setVisible] = useState(false);

	const outStandingTasksCount = useMemo(
		() => estimatedTotalTime(outstandingPlans.map((plan) => plan.tasks?.map((task) => task))).totalTasks,
		[outstandingPlans]
	);

	const lastVisited = window?.localStorage.getItem(HAS_VISITED_OUTSTANDING_TASKS);

	useEffect(() => {
		if (lastVisited == new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]) {
			setVisible(false);
		} else {
			setVisible(true);
			if (!lastVisited) {
				window?.localStorage.setItem(
					HAS_VISITED_OUTSTANDING_TASKS,
					new Date(moment().subtract(1, 'days').format('YYYY-MM-DD')).toISOString().split('T')[0]
				);
			}
		}

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
			{visible && (
				<div className="rounded-2xl dark:border-dark--theme-light border py-2 px-6 flex justify-between items-center text-xs mb-2">
					<div>
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {outStandingTasksCount}{' '}
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.USER_LABEL')}{' '}
						<span className="font-medium">
							{t('pages.home.OUTSTANDING_NOTIFICATIONS.OUTSTANDING_VIEW')}
						</span>
					</div>
					<div className="flex items-center gap-5">
						<div>
							<Link
								href={`/profile/${user?.id}?name=${name || ''}`}
								className="bg-primary text-white py-2 px-4 flex gap-2 items-center rounded-xl"
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
					if (plan.employeeId === user?.employee.id) return false;
					if (!plan.date) return false;

					const isTodayOrBefore = moment(plan.date).isSameOrBefore(moment().endOf('day'));
					if (!isTodayOrBefore) return false;

					const hasIncompleteTasks = plan.tasks?.some((task) => task.status !== 'completed');
					return hasIncompleteTasks;
				})
				.map((plan) => ({ employeeId: plan.employeeId, employee: plan.employee })),
		[outstandingTasks, user?.employee.id]
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
		if (lastVisited == new Date(moment().format('YYYY-MM-DD')).toISOString().split('T')[0]) {
			setVisible(false);
		} else {
			setVisible(true);
			if (!lastVisited) {
				window?.localStorage.setItem(
					HAS_VISITED_OUTSTANDING_TASKS,
					new Date(moment().subtract(1, 'days').format('YYYY-MM-DD')).toISOString().split('T')[0]
				);
			}
		}

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
				<div className="rounded-2xl dark:border-dark--theme-light border py-4 px-6 flex justify-between items-center text-xs mb-2">
					<div>
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {uniqueEmployees?.length} team member(s)
						with uncompleted tasks, please see{' '}
						<span>
							{uniqueEmployees?.map((em) => (
								<Link
									href={`/profile/${em.employee?.user?.id}?name=${em.employee?.user?.name || em.employee?.user?.firstName || em.employee?.user?.lastName || em.employee?.user?.username}`}
									key={em.employeeId}
									className="text-primary font-semibold underline"
								>
									{em.employee?.fullName},{' '}
								</Link>
							))}
						</span>
					</div>
					<div className="flex items-center gap-5">
						<Tooltip label={t('common.CLOSE')}>
							<Cross2Icon className="text-xl cursor-pointer" onClick={onClose} />
						</Tooltip>
					</div>
				</div>
			)}
		</>
	);
});
