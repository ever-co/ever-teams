import { ProgressBar, SegmentedProgressBar } from 'lib/components';
import { ScreenshootPerHour, ScreenshootPerHourTeam } from './components/screenshoots-per-hour';
import { useTimeSlots } from '@app/hooks/features/useTimeSlot';
import { groupDataByHour } from '@app/helpers/array-data';
import { useTranslations } from 'next-intl';
import { ScreenshootSkeleton } from './components/screenshoots-per-hour-skeleton';
import { useLiveTimerStatus } from '@app/hooks';
import { IEmployee, IScreenshot, ITimerSlot } from '@/app/interfaces';

const timeSlots: ITimerSlot[] = Array.from({ length: 6 }, (_, i) => {
	const hour = 18 + i; // Start at 18:00, then 19:00, etc.

	// // Skip generating time slots for 20:00 to 21:00
	// if (hour === 20) {
	// 	return []; // Skip this hour
	// }

	const baseTime = new Date();
	baseTime.setHours(hour, 0, 0, 0); // Set the start time at the specified hour

	// Create 10 time slots within each hour
	const timeSlotArray = Array.from({ length: 4 }, (_, j) => {
		const slotTime = new Date(baseTime.getTime() + j * 6000); // 6000 ms = 6 seconds interval

		const id = `timerSlot-${i + 1}-${j + 1}`;
		const tenantId = `tenant-${i % 3}`;
		const organizationId = `organization-${i % 5}`;
		const employeeId = `employee-${i % 10}`;

		const screenshots: IScreenshot[] = Array.from({ length: 10 }, (_, k) => ({
			organizationId,
			id: `screenshot-${id}-${k + 1}`,
			createdAt: slotTime.toISOString(),
			updatedAt: slotTime.toISOString(),
			deletedAt: null,
			isActive: true,
			isArchived: false,
			tenantId,
			file: `screenshot-${id}-${k + 1}.png`,
			thumb: `thumb-${id}-${k + 1}.png`,
			thumbUrl: `https://dummyimage.com/150x150/011/fff&text=Thumb-${id}-${k + 1}`,
			recordedAt: slotTime.toISOString(),
			isWorkRelated: true,
			description: `Screenshot ${k + 1} for ${id}`,
			timeSlotId: id,
			userId: `user-${i % 8}`,
			fullUrl: `https://dummyimage.com/800x600/000/fff&text=Screenshot-${id}-${k + 1}`,
			apps: [`App-${k % 3}`, `App-${(k + 1) % 3}`]
		}));

		const employee: IEmployee = {
			id: employeeId,
			createdAt: slotTime.toISOString(),
			updatedAt: slotTime.toISOString(),
			tenantId,
			organizationId,
			valueDate: null,
			isActive: true,
			short_description: null,
			description: null,
			startedWorkOn: null,
			isTrackingTime: Math.random() > 0.5,
			endWork: null,
			payPeriod: 'Monthly',
			billRateValue: Math.random() * 100,
			billRateCurrency: 'USD',
			reWeeklyLimit: Math.floor(Math.random() * 40) + 1,
			offerDate: null,
			acceptDate: null,
			rejectDate: null,
			employeeLevel: `Level-${Math.floor(Math.random() * 5) + 1}`,
			anonymousBonus: null,
			averageIncome: null,
			averageBonus: null,
			totalWorkHours: null,
			averageExpenses: null,
			show_anonymous_bonus: null,
			show_average_bonus: null,
			show_average_expenses: null,
			show_average_income: null,
			show_billrate: null,
			show_payperiod: null,
			show_start_work_on: null,
			isJobSearchActive: null,
			linkedInUrl: null,
			facebookUrl: null,
			instagramUrl: null,
			twitterUrl: null,
			githubUrl: null,
			gitlabUrl: null,
			upworkUrl: null,
			stackoverflowUrl: null,
			isVerified: null,
			isVetted: null,
			totalJobs: null,
			jobSuccess: null,
			profile_link: `https://dummyimage.com/800x600/000/fff&text=Profile-${employeeId}`,
			isTrackingEnabled: Math.random() > 0.5,
			userId: `user-${i % 8}`,
			contactId: null,
			organizationPositionId: null,
			fullName: `Employee ${i % 10}`,
			isOnline: Math.random() > 0.5
		};

		return {
			id,
			createdAt: slotTime.toISOString(),
			updatedAt: slotTime.toISOString(),
			deletedAt: null,
			isActive: true,
			isArchived: false,
			tenantId,
			organizationId,
			duration: Math.floor(Math.random() * 3600) + 60,
			keyboard: Math.floor(Math.random() * 100),
			mouse: Math.floor(Math.random() * 100),
			overall: Math.floor(Math.random() * 200),
			startedAt: slotTime.toISOString(),
			employeeId,
			employee,
			stoppedAt: new Date(slotTime.getTime() + Math.random() * 3600000).toISOString(),
			percentage: Math.random() * 100,
			keyboardPercentage: Math.random() * 100,
			mousePercentage: Math.random() * 100,
			screenshots
		};
	});

	return timeSlotArray;
}).flat();

export function ScreenshootTab() {
	const { loading } = useTimeSlots();
	const t = useTranslations();

	const activityPercent = timeSlots.reduce((acc, el) => acc + el.percentage, 0) / timeSlots.length;
	// const workedSeconds = timeSlots.reduce((acc, el) => acc + el.duration, 0);
	const {
		time: { h, m }
	} = useLiveTimerStatus();
	return (
		<div>
			<div className="flex items-center gap-4">
				{/* Activity */}
				<div className=" border-2 rounded-[1rem] p-6 min-h-[8rem] min-w-[20rem] flex flex-col justify-between gap-3  bg-white dark:bg-[#26272C]">
					<span>{t('timer.TIME_ACTIVITY')}</span>
					<div className="flex flex-col gap-3">
						<h2 className="text-3xl font-medium">
							{isNaN(parseFloat(activityPercent.toFixed(2))) ? '00' : activityPercent.toFixed(2)} %
						</h2>
						<ProgressBar width={'80%'} progress={`${activityPercent}%`} />
					</div>
				</div>

				{/* Total hours */}
				<div className=" border-2 rounded-[1rem] p-6 min-h-[8rem] min-w-[20rem] flex flex-col justify-between gap-3  bg-white dark:bg-[#26272C]">
					<span>{t('timer.TOTAL_HOURS')}</span>
					<div className="flex flex-col gap-3">
						<h2 className="text-3xl font-medium">{`${h}:${m}:00`}</h2>
						<SegmentedProgressBar width={'80%'} progress={`${activityPercent}%`} />
					</div>
				</div>
			</div>

			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshootPerHour
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{timeSlots.length < 1 && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<h3>{t('timer.NO_SCREENSHOOT')}</h3>
				</div>
			)}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
}

export function ScreenshootTeamTab() {
	const { timeSlots, loading } = useTimeSlots(true);
	const t = useTranslations();

	return (
		<div>
			{groupDataByHour(timeSlots).map((hourData, i) => (
				<ScreenshootPerHourTeam
					key={i}
					timeSlots={hourData.items}
					startedAt={hourData.startedAt}
					stoppedAt={hourData.stoppedAt}
				/>
			))}
			{timeSlots.length < 1 && !loading && (
				<div className="p-4 py-8 my-4 flex items-center justify-center rounded-md dark:bg-[#1E2025] border-[0.125rem] dark:border-[#FFFFFF0D]">
					<h3>{t('timer.NO_SCREENSHOOT')}</h3>
				</div>
			)}
			{loading && timeSlots.length < 1 && <ScreenshootSkeleton />}
		</div>
	);
}
