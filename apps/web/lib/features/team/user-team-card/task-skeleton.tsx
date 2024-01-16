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
		<div className="hidden sm:flex row font-normal justify-between pb-5 pt-8 hidde dark:text-[#7B8089]">
			{/* <li className="pr-[50px]">{t('common.STATUS')}</li> */}
			<div className="2xl:w-[20.625rem] text-center">{t('common.NAME')}</div>
			<div className="w-1"></div>
			<div className="2xl:w-80 3xl:w-[32rem] w-1/5 text-center">{t('common.TASK')}</div>
			<div className="w-1"></div>
			<Tooltip label={t('task.taskTableHead.TOTAL_WORKED_TODAY_HEADER_TOOLTIP')}>
				<div className="2xl:w-48 3xl:w-[12rem] w-1/5 lg:px-4 px-2 flex flex-col justify-center text-center">
					{t('task.taskTableHead.TASK_WORK.TITLE')}
					<br />
					{t('common.TASK')}
				</div>
			</Tooltip>
			<div className="w-1"></div>
			<div className=" text-center w-1/5 lg:px-3 2xl:w-52 3xl:w-64">{t('common.ESTIMATE')}</div>
			<div className="w-1"></div>
			<Tooltip label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')}>
				<div className="w-1/5 lg:px-3 2xl:w-52 3xl:w-64 text-center">
					{t('task.taskTableHead.TOTAL_WORK.TITLE')}
					<br />
					{t('common.TODAY')}
				</div>
			</Tooltip>
		</div>
	);
}
