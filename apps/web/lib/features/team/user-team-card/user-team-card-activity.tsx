import { Transition } from '@headlessui/react';
import { ProgressBar } from 'lib/components';
import React from 'react';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
// import { groupDataByHour } from '@app/helpers/array-data';
import { useTranslations } from 'next-intl';
import { useLiveTimerStatus } from '@app/hooks';
import { ScreenshootSkeleton } from 'lib/features/activity/components/screenshoots-per-hour-skeleton';
import { OT_Member } from '@app/interfaces';

const UserTeamActivity = ({ member, showActivity }: { member: OT_Member | undefined; showActivity: boolean }) => {
	const id = member?.employeeId ?? '';
	const { timeSlots, loading } = useTimeSlots(id);
	const t = useTranslations();

	const activityPercent = timeSlots.reduce((acc, el) => acc + el.percentage, 0) / timeSlots.length;
	// const workedSeconds = timeSlots.reduce((acc, el) => acc + el.duration, 0);
	const {
		time: { h, m }
	} = useLiveTimerStatus();
	return (
		<Transition
			show={!!showActivity}
			enter="transition-opacity duration-75"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
		>
			<div className="">
				<div className="flex justify-between">
					<div className="w-56 ">
						<div className="shadow rounded-md w-full p-4 m-4 h-32 bg-white dark:bg-[#26272C]">
							<span>{t('timer.TIME_ACTIVITY')}</span>
							<h2 className="text-3xl font-bold my-3">{activityPercent.toFixed(2)} %</h2>
							<ProgressBar width={'80%'} progress={`${activityPercent}%`} className="my-2" />
						</div>
						<div className="shadow rounded-md w-full p-4 m-4 h-32 bg-white dark:bg-[#26272C]">
							<span>{t('timer.TOTAL_HOURS')}</span>
							<h2 className="text-3xl font-bold my-3">{`${h}:${m}:00`}</h2>
							<ProgressBar width={'80%'} progress={`${activityPercent}%`} />
						</div>
					</div>
					<div className="">Sites Visited</div>
					<div className="">Apps </div>
				</div>
				<div className="">Screenshot</div>
				{timeSlots.length < 1 && !loading && (
					<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
						<h3>{t('timer.NO_SCREENSHOOT')}</h3>
					</div>
				)}
				{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
			</div>
		</Transition>
	);
};

export default UserTeamActivity;
