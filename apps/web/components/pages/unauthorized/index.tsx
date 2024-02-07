'use client';

import SadCry from '@components/ui/svgs/sad-cry';
import { Button, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

function UnauthorizedPage() {
	const t = useTranslations();

	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<SadCry width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">
					{/* {t('pages.error.TITLE')} */}
					Unauthorized
				</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{/* {t('pages.error.HEADING_TITLE')} */}
				This page can&apos;t be reached
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.error.HEADING_DESCRIPTION')}
				</Text>
				<Link href="/">
					<Button className="m-auto mt-10 font-normal rounded-lg pl-7 pr-7">Home</Button>
				</Link>
			</div>
		</div>
	);
}

export default UnauthorizedPage;
