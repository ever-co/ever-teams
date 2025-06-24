'use client';
import { useAuthenticateUser } from '@/core/hooks';
import { Cross2Icon, EyeOpenIcon } from '@radix-ui/react-icons';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { Tooltip } from '../duplicated-components/tooltip';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { IDailyPlan } from '@/core/types/interfaces/task/daily-plan/daily-plan';
import { TUser } from '@/core/types/schemas';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import {
	dismissNotification,
	markOutstandingTasksVisited,
	shouldShowNotification
} from '@/core/lib/helpers/notifications';
import { NOTIFICATION_KEYS } from '@/core/constants/config/notification';
import { TTask } from '@/core/types/schemas/task/task.schema';

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
			{isTeamManager && dailyPlan.items?.length > 0 && (
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
	const name = user?.name || user?.firstName || user?.lastName || user?.username;
	const [visible, setVisible] = useState(false);

	const { validTasks, outStandingTasksCount } = useMemo(() => {
		const validTasks = outstandingPlans.flatMap((plan) => plan.tasks || []).filter((t) => t?.id);
		const uniqueIds = new Set(validTasks.map((t) => t.id));
		return {
			validTasks: validTasks as Partial<TTask>[],
			outStandingTasksCount: uniqueIds.size
		};
	}, [outstandingPlans]);

	useEffect(() => {
		const show = shouldShowNotification(outStandingTasksCount, validTasks, NOTIFICATION_KEYS.USER_OUTSTANDING);
		setVisible(show);
	}, [outStandingTasksCount, validTasks]);

	const onClose = useCallback(() => {
		dismissNotification(NOTIFICATION_KEYS.USER_OUTSTANDING);
		setVisible(false);
		markOutstandingTasksVisited();
	}, []);

	return visible && outStandingTasksCount > 0 ? (
		<div className="flex justify-between items-center px-4 py-2 text-xs rounded-xl border dark:border-dark--theme-light">
			<div>
				{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {outStandingTasksCount}{' '}
				{t('pages.home.OUTSTANDING_NOTIFICATIONS.USER_LABEL')}{' '}
				<span className="font-medium">{t('pages.home.OUTSTANDING_NOTIFICATIONS.OUTSTANDING_VIEW')}</span>
			</div>
			<div className="flex gap-5 items-center">
				<Link
					href={`/profile/${user?.id}?name=${name || ''}`}
					className="flex gap-2 items-center px-2.5 py-1 text-white rounded-xl bg-primary"
					onClick={() => {
						onClose();
						localStorage.setItem('task-tab', 'dailyplan');
						localStorage.setItem('daily-plan-tab', 'Outstanding');
					}}
				>
					<EyeOpenIcon />
					<span>{t('pages.home.OUTSTANDING_NOTIFICATIONS.VIEW_BUTTON')}</span>
				</Link>
				<Tooltip label={t('common.CLOSE')}>
					<Cross2Icon className="text-xl cursor-pointer" onClick={onClose} />
				</Tooltip>
			</div>
		</div>
	) : null;
});

const ManagerOutstandingUsersNotification = memo(function ManagerOutstandingUsersNotification({
	outstandingTasks
}: {
	outstandingTasks: IDailyPlan[];
}) {
	const { user } = useAuthenticateUser();
	const t = useTranslations();
	const [visible, setVisible] = useState(false);

	const employeeWithOutstanding = useMemo(() => {
		return outstandingTasks
			.filter((plan) => {
				if (plan.employeeId === user?.employee?.id || !plan.date) return false;
				const isDue = moment(plan.date).isSameOrBefore(moment().endOf('day'));
				const hasIncomplete = plan.tasks?.some((task) => task.status !== ETaskStatusName.COMPLETED);
				return isDue && hasIncomplete;
			})
			.map((plan) => ({
				employeeId: plan.employeeId,
				employee: plan.employee
			}));
	}, [outstandingTasks, user?.employee?.id]);

	const uniqueEmployees = useMemo(() => {
		const map = new Map<string, IEmployee>();
		for (const emp of employeeWithOutstanding) {
			if (emp.employeeId && !map.has(emp.employeeId)) {
				map.set(emp.employeeId, emp.employee!);
			}
		}
		return Array.from(map.entries()).map(([employeeId, employee]) => ({ employeeId, employee }));
	}, [employeeWithOutstanding]);

	useEffect(() => {
		const show = shouldShowNotification(
			uniqueEmployees.length,
			uniqueEmployees.map((e) => ({ id: e.employeeId, status: 'outstanding' })),
			NOTIFICATION_KEYS.MANAGER_OUTSTANDING
		);
		setVisible(show);
	}, [uniqueEmployees]);

	const onClose = useCallback(() => {
		dismissNotification(NOTIFICATION_KEYS.MANAGER_OUTSTANDING);
		setVisible(false);
		markOutstandingTasksVisited();
	}, []);

	return uniqueEmployees.length > 0 && visible ? (
		<div className="flex justify-between items-center px-4 py-2.5 mb-2 text-xs rounded-xl border dark:border-dark--theme-light">
			<div>
				{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {uniqueEmployees.length} team member(s) with
				uncompleted tasks, please see{' '}
				{uniqueEmployees.map((em, i) => {
					const name =
						em.employee?.user?.name ||
						em.employee?.user?.firstName ||
						em.employee?.user?.lastName ||
						em.employee?.user?.username;
					return (
						<Link
							key={em.employeeId}
							href={`/profile/${em.employee?.user?.id}?name=${name}`}
							className="font-semibold underline text-primary"
						>
							{name}
							{i !== uniqueEmployees.length - 1 && ', '}
						</Link>
					);
				})}
			</div>
			<div className="flex gap-5 items-center">
				<Tooltip label={t('common.CLOSE')}>
					<Cross2Icon className="text-xl cursor-pointer" onClick={onClose} />
				</Tooltip>
			</div>
		</div>
	) : null;
});
