import { Tooltip } from 'lib/components';
import { useTranslations } from 'next-intl';
import React from 'react';

function UserTeamTableHeader() {
	const t = useTranslations();
	return (
		<thead className="font-normal h-16 w-full dark:text-[#7B8089] dark:bg-dark-high px-8 pb-[18px] mb-[11px] pt-3">
			<tr className="text-center w-full items-center">
				<th className="w-[32%] 2xl:!w-[28%] pl-10 font-normal text-left">
					{t('common.TEAM')} {t('common.MEMBER')}
				</th>
				<th className="!w-[39%] font-normal">{t('common.TASK')}</th>
				<th className={`!w-[16%] font-normal`}>
					<Tooltip label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')}>
						{t('common.TASK')} Time
					</Tooltip>
				</th>
				<th className="!w-[16%] font-normal">{t('common.ESTIMATE')}</th>
				<th className="!w-[50%] font-normal">{t('common.ACTION')}</th>
			</tr>
		</thead>
	);
}

export default UserTeamTableHeader;
