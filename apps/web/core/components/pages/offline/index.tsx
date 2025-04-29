import { Timer } from '@/lib/features';
import { cn } from '@/lib/utils';
import SadCry from '@/core/components/ui/svgs/sad-cry';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';

interface IPropsOffline {
	showTimer?: boolean;
}

function Offline({ showTimer }: IPropsOffline) {
	const t = useTranslations();

	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<SadCry width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">{t('pages.offline.STATUS_NETWORK')}</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.offline.HEADING_TITLE')}
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.offline.HEADING_SUB_DESCRIPTION')}
				</Text>
			</div>
			{showTimer && (
				<Timer
					showTimerButton={false}
					className={cn(
						'p-5 rounded-2xl shadow-xlcard',
						'dark:border-[0.125rem] dark:border-[#28292F]',
						'dark:bg-[#1B1D22]'
					)}
				/>
			)}
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.offline.HEADING_DESCRIPTION')}
				</Text>
			</div>
		</div>
	);
}

export default Offline;
