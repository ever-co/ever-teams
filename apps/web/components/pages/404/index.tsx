"use client"
import SadCry from '@components/ui/svgs/sad-cry';
import { Button, Text } from 'lib/components';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
function NotFound() {
	const { t } = useTranslation();
	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<SadCry width={97} height={97}/>
				<Text className="text-[78px] font-semibold text-chetwodeBlue">404!</Text>
			</div>

				<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
					{t('pages.page404.HEADING_TITLE')}
				</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.page404.HEADING_DESCRIPTION')}
				</Text>
				<Link href="/">
					<Button className="m-auto mt-10 font-normal rounded-lg pl-7 pr-7">
						{t('pages.page404.LINK_LABEL')}
					</Button>
				</Link>
			</div>
		</div>
	);
}

export default NotFound;
