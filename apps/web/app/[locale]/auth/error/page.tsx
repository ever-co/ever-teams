'use client';

import SadCry from '@components/ui/svgs/sad-cry';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
export default function Page() {
	const t = useTranslations();
	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<SadCry width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">{t('pages.error.TITLE')}</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.error.HEADING_TITLE')}
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.error.HEADING_DESCRIPTION')}
				</Text>
				<Link href="/auth/passcode">Try again</Link>
			</div>

			<div className="p-2 flex flex-col gap-y-3 container max-w-5xl rounded mt-5">
				<h4 className="text-2xl text-red-400 font-medium text-center">Error on signing</h4>
			</div>
		</div>
	);
}
