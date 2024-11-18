import { Tooltip } from 'lib/components';
import { useTranslations } from 'next-intl';

export function UserTeamCardSkeleton() {
	return (
		<div
			role="status"
			className="p-4 border divide-y divide-gray-200 shadow rounded-xl animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div>
						<div className="w-32 h-3 mb-2 bg-gray-200 rounded-full dark:bg-gray-700"></div>
					</div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-24"></div>
			</div>
		</div>
	);
}

export function InviteUserTeamSkeleton() {
	return (
		<div
			role="status"
			className="p-4 mt-3 border divide-y divide-gray-200 shadow rounded-xl animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-24 bg-gray-200 h-9 rounded-xl dark:bg-gray-700"></div>
				</div>
			</div>
		</div>
	);
}

export function UserTeamCardHeader() {
	const t = useTranslations();
	return (
		<div className="w-full h-14  dark:text-[#7B8089] font-normal  -mt-1 z-50 dark:bg-dark-high px-8 m-0">
			<div className="w-full h-full px-4 ml-4 md:px-8">
				<div className="relative flex items-center justify-around w-full h-full m-0">
					<div className="inline-flex items-center space-x-2 2xl:w-[20.625rem] w-1/4">
						<div className="w-[50px] h-full flex justify-center items-center"></div>
						<div className="lg:w-64 w-1/2 flex flex-col gap-1.5 text-nowrap">
							{t('common.TEAM')} {t('common.MEMBER')}
						</div>
					</div>
					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />
					<div className="flex justify-between items-center min-w-[24%]">
						<div className="h-full w-full flex flex-col items-center justify-center text-nowrap gap-[1.0620rem] max-h-full overflow-hidden flex-1 lg:px-4 px-2 overflow-y-hidden">
							{t('common.TASK')}
						</div>
					</div>
					<div className="w-4 self-stretch border-l-[0.125rem] border-l-transparent " />
					<div className="2xl:w-48 3xl:w-[12rem] capitalize w-1/5 lg:px-4 !pl-6 lg:!pl-8  flex flex-col items-center text-center  justify-center">
						<Tooltip label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')} className="text-nowrap">
							{t('dailyPlan.TASK_TIME')}
						</Tooltip>
					</div>
					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />
					<div className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64 !pl-14 text-center text-nowrap">
						{t('common.ESTIMATE')}
					</div>
					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />
					<div className="flex justify-center items-center cursor-pointer w-1/5 gap-4 lg:px-3 2xl:w-52 max-w-[13rem] !pl-14 text-center">
						<Tooltip
							label={t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP')}
							className="text-nowrap"
						>
							{t('dailyPlan.TOTAL_TODAY')}
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
}
