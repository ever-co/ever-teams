'use client';
import { useAuthenticateUser, useDailyPlan } from '@app/hooks';
import { IDailyPlan, IUser } from '@app/interfaces';
import { Cross2Icon, EyeOpenIcon } from '@radix-ui/react-icons';
import { Tooltip } from 'lib/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function TeamOutstandingNotifications() {
	const { getEmployeeDayPlans, outstandingPlans } = useDailyPlan();

	const { user } = useAuthenticateUser();

	useEffect(() => {
		getEmployeeDayPlans(user?.employee.id || '');
	}, [getEmployeeDayPlans, user?.employee.id]);

	return (
		<>
			{outstandingPlans && outstandingPlans.length > 0 && (
				<UserOutstandingNotification outstandingTasks={outstandingPlans} user={user} />
			)}
		</>
	);
}

function UserOutstandingNotification({ outstandingTasks, user }: { outstandingTasks: IDailyPlan[]; user?: IUser }) {
	const t = useTranslations();

	// Notification will be displayed 6 hours after the user closed it
	const REAPPEAR_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds;
	const DISMISSAL_TIMESTAMP_KEY = 'user-saw-notif';

	const name = user?.name || user?.firstName || user?.lastName || user?.username;

	const [visible, setVisible] = useState(false);
	const tasks = outstandingTasks.flatMap((plan) => plan.tasks);

	useEffect(() => {
		const checkNotification = () => {
			const alreadySeen = window && parseInt(window?.localStorage.getItem(DISMISSAL_TIMESTAMP_KEY) || '0', 10);
			const currentTime = new Date().getTime();

			if (!alreadySeen || currentTime - alreadySeen > REAPPEAR_INTERVAL) {
				setVisible(true);
			}
		};

		checkNotification();
		const intervalId = setInterval(checkNotification, REAPPEAR_INTERVAL);
		return () => clearInterval(intervalId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClose = () => {
		window && window?.localStorage.setItem(DISMISSAL_TIMESTAMP_KEY, new Date().getTime().toString());
		setVisible(false);
	};

	return (
		<>
			{visible && (
				<div className="rounded-2xl dark:border-dark--theme-light border py-2 px-6 flex justify-between items-center text-xs mb-2">
					<div>
						{t('pages.home.OUTSTANDING_NOTIFICATIONS.SUBJECT')} {tasks?.length}{' '}
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
}
