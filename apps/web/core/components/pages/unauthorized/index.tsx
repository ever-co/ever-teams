'use client';

import { LockClosedIcon } from '@radix-ui/react-icons';
import { Button, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

function UnauthorizedPage() {
	const t = useTranslations();

	return (
		<div className="flex flex-col gap-7 items-center mt-28">
			<div className="flex relative gap-4 justify-center items-center m-auto text-center">
				<LockClosedIcon width={97} height={97} fill="#8C7AE4" className="text-[#8C7AE4]" />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">{t('pages.unauthorized.TITLE')}</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.unauthorized.HEADING_TITLE')}
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] container !max-w-5xl leading-8 font-normal text-center text-gray-400">
					{t('pages.unauthorized.HEADING_DESCRIPTION')}
				</Text>
				<Link href={DEFAULT_APP_PATH}>
					<Button className="pr-7 pl-7 m-auto mt-10 font-normal rounded-lg">Login</Button>
				</Link>
			</div>
		</div>
	);
}

export default UnauthorizedPage;
