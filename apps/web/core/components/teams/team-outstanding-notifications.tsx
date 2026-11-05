'use client';
import { useAuthenticateUser } from '@/core/hooks';
import { Clock, Users } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Notice } from '@/core/components/common/notice';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import { IEmployee } from '@/core/types/interfaces/organization/employee';
import { TDailyPlan, TUser } from '@/core/types/schemas';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import {
	dismissNotification,
	markOutstandingTasksVisited,
	shouldShowNotification
} from '@/core/lib/helpers/notifications';
import { getDailyPlanDay } from '@/core/lib/helpers/daily-plan-day';
import { NOTIFICATION_KEYS } from '@/core/constants/config/notification';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { isTaskFinished } from '@/core/lib/helpers/task';

const MEMBER_LINK_CLASS =
	'rounded-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

function employeeNameOf(employee: IEmployee | undefined): string {
	const user = employee?.user;
	const candidates = [user?.name, user?.firstName, user?.lastName, user?.username];
	const name = candidates.find(Boolean);

	return name ?? '';
}

export function TeamOutstandingNotifications({
	outstandingPlans,
	dailyPlan,
	isTeamManager,
	user
}: {
	outstandingPlans: TDailyPlan[];
	dailyPlan: { items: TDailyPlan[] };
	isTeamManager: boolean;
	user: TUser | null;
}) {
	return (
		<div className="mb-1 flex flex-col gap-2">
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
	outstandingPlans: TDailyPlan[];
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

	const isShown = visible && outStandingTasksCount > 0;
	if (!isShown) {
		return null;
	}

	return (
		<Notice
			tone="warning"
			glyph={<Clock />}
			title={t('notifications.NOTICES.OUTSTANDING_TITLE', { count: outStandingTasksCount })}
			description={t('notifications.NOTICES.OUTSTANDING_TEXT')}
			actions={
				<Button asChild variant="outline" size="sm">
					<Link
						href={`/profile/${user?.id}?name=${name || ''}`}
						onClick={() => {
							onClose();
							localStorage.setItem('task-tab', 'dailyplan');
							localStorage.setItem('daily-plan-tab', 'Outstanding');
						}}
					>
						{t('notifications.NOTICES.OUTSTANDING_ACTION')}
					</Link>
				</Button>
			}
			onDismiss={onClose}
			dismissLabel={t('notifications.NOTICES.DISMISS')}
		/>
	);
});

const ManagerOutstandingUsersNotification = memo(function ManagerOutstandingUsersNotification({
	outstandingTasks
}: {
	outstandingTasks: TDailyPlan[];
}) {
	const { user } = useAuthenticateUser();
	const t = useTranslations();
	const [visible, setVisible] = useState(false);

	const employeeWithOutstanding = useMemo(() => {
		return outstandingTasks
			.filter((plan) => {
				if (plan.employeeId === user?.employee?.id || !plan.date) return false;
				const isDue = getDailyPlanDay(plan.date) <= moment().format('YYYY-MM-DD');
				const hasIncomplete = plan.tasks?.some((task) => !isTaskFinished(task.status));
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
			uniqueEmployees.map((e) => ({ id: e.employeeId, status: 'outstanding' as ETaskStatusName })),
			NOTIFICATION_KEYS.MANAGER_OUTSTANDING
		);
		setVisible(show);
	}, [uniqueEmployees]);

	const onClose = useCallback(() => {
		dismissNotification(NOTIFICATION_KEYS.MANAGER_OUTSTANDING);
		setVisible(false);
		markOutstandingTasksVisited();
	}, []);

	const isShown = uniqueEmployees.length > 0 && visible;
	if (!isShown) {
		return null;
	}

	const lastIndex = uniqueEmployees.length - 1;
	const memberLinks = uniqueEmployees.map((em, i) => {
		const memberName = employeeNameOf(em.employee);
		const isLast = i === lastIndex;
		return (
			<Fragment key={em.employeeId}>
				<Link href={`/profile/${em.employee?.user?.id}?name=${memberName}`} className={MEMBER_LINK_CLASS}>
					{memberName}
				</Link>
				{!isLast && ', '}
			</Fragment>
		);
	});

	return (
		<Notice
			tone="info"
			glyph={<Users />}
			title={t('notifications.NOTICES.MANAGER_TITLE', { count: uniqueEmployees.length })}
			description={memberLinks}
			onDismiss={onClose}
			dismissLabel={t('notifications.NOTICES.DISMISS')}
		/>
	);
});
