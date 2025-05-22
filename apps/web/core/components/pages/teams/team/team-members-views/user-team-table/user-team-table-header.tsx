import { fullWidthState } from '@/core/stores/common/full-width';
import { useAtomValue } from 'jotai';
import { Container } from '@/core/components';
import { useTranslations } from 'next-intl';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';

function UserTeamTableHeader() {
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<Container fullWidth={fullWidth} className="!overflow-x-auto  !mx-0 px-[3.2rem]">
			<div className="font-normal h-14   dark:text-[#7B8089] dark:bg-dark-high py-3 mb-[11px]">
				<div className="text-center flex w-full items-center">
					<div className="w-[29.2%] shrink-0 font-normal ">
						{t('common.TEAM')} {t('common.MEMBER')}
					</div>
					<div className="w-[31.2%] shrink-0 font-normal">{t('common.TASK')}</div>
					<div className={`w-[15.6%] shrink-0 font-normal`}>
						<Tooltip label={t('task.taskTableHead.WORKED_ON_TASK_HEADER_TOOLTIP')}>
							{t('dailyPlan.TASK_TIME')}
						</Tooltip>
					</div>
					<div className="w-[19.5%] shrink-0 font-normal">{t('common.ESTIMATE')}</div>
					<div className="font-normal grow">{t('common.ACTION')}</div>
				</div>
			</div>
		</Container>
	);
}

export default UserTeamTableHeader;
