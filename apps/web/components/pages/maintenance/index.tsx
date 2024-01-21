'use client';
import { RocketIcon } from '@components/ui/svgs/rocket';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';
function Maintenance() {
	const t = useTranslations();
	return (
		<div className="mt-28 flex flex-col gap-7 justify-center items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<RocketIcon width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">
					{t('pages.maintenance.HEADING_TITLE')}
				</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.maintenance.HEADING_DESCRIPTION')}
			</Text>
		</div>
	);
}

export default Maintenance;
