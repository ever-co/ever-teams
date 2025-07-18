import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { useTranslations } from 'next-intl';

export function UserTeamCardSkeleton() {
	return (
		<div
			role="status"
			className="p-4 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div>
						<div className="mb-2 w-32 h-3 bg-gray-200 rounded-full dark:bg-gray-700"></div>
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
			className="p-4 mt-3 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-24 h-9 bg-gray-200 rounded-xl dark:bg-gray-700"></div>
				</div>
			</div>
		</div>
	);
}

export function UserTeamCardHeader() {
	const t = useTranslations();
	return (
		<div className="w-full h-12 dark:text-[#7B8089] font-normal -mt-1 z-50 dark:bg-dark-high px-8 m-0">
			<div className="px-4 ml-4 w-full h-full md:px-8">
				<div className="flex relative items-center m-0 w-full h-full">
					<div className="flex justify-center items-center ml-6 w-72">
						<span className="font-semibold text-nowrap">
							{t('common.TEAM')} {t('common.MEMBER')}
						</span>
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					<div className="flex-1 flex justify-center md:min-w-[25%] xl:min-w-[30%] !max-w-[250px] px-2 lg:px-4">
						<span className="font-medium text-center text-nowrap">{t('common.TASK')}</span>
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					<div className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex justify-center items-center pl-6">
						<Tooltip
							label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')}
							className="font-semibold text-nowrap"
						>
							{t('dailyPlan.TASK_TIME')}
						</Tooltip>
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					<div className="flex justify-center items-center pl-6 2xl:w-52 3xl:w-64">
						<span className="font-semibold text-nowrap">{t('common.ESTIMATE')}</span>
					</div>

					<div className="w-1 self-stretch border-l-[0.125rem] border-l-transparent" />

					<div className="w-1/5 2xl:w-52 max-w-[13rem] flex justify-end">
						<Tooltip
							label={t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP')}
							className="font-semibold text-nowrap"
						>
							{t('dailyPlan.TOTAL_TODAY')}
						</Tooltip>
					</div>

					<div className="w-10"></div>
				</div>
			</div>
		</div>
	);
}
