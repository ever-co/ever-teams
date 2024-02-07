'use client';

import { LockClosedIcon } from '@radix-ui/react-icons';
import { Button, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

function UnauthorizedPage() {
	const t = useTranslations();

	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<LockClosedIcon width={97} height={97} fill="#8C7AE4" className="text-[#8C7AE4]" />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">
					{/* {t('pages.error.TITLE')} */}
					Unauthorized
				</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{/* {t('pages.error.HEADING_TITLE')} */}
				You are not authorized to access this page
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] container !max-w-5xl leading-8 font-normal text-center text-gray-400">
					{t('pages.error.HEADING_DESCRIPTION')}
					We apologize for the inconvenience, but you are not authorized to access to this page. If you
					believe this is an error. Please login
				</Text>
				<Link href="/auth/login">
					<Button className="m-auto mt-10 font-normal rounded-lg pl-7 pr-7">Login</Button>
				</Link>
			</div>
		</div>
	);
}

export default UnauthorizedPage;
