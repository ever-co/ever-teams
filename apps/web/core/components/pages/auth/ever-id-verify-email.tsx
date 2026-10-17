'use client';

import { EnvelopeClosedIcon } from '@radix-ui/react-icons';
import { Button } from '@/core/components/common/button';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import { restartEverIdSignIn } from '@/core/lib/auth/ever-id/restart';

/** The route that opens Ever ID's verification form for the person the refused sign-in was for. */
const VERIFY_EMAIL_ROUTE = '/api/auth/ever-id/verify-email';

/**
 * Where an Ever ID sign-in ends when Ever ID has not verified the person's e-mail address yet: the API signs in
 * verified addresses only. Instead of "access denied", the person verifies the address on Ever ID (the route reads who
 * they are from the sealed cookie the sign-in set) and signs in with Ever ID again.
 */
export default function EverIdVerifyEmail() {
	const t = useTranslations();

	return (
		<div className="flex flex-col gap-6 items-center px-4 mx-auto mt-28 max-w-2xl text-center">
			<EnvelopeClosedIcon width={64} height={64} className="text-[#8C7AE4]" aria-hidden="true" />
			<Text className="text-3xl font-bold text-[#282048] dark:text-light--theme">
				{t('pages.auth.everId.EMAIL_UNVERIFIED_TITLE')}
			</Text>
			<Text className="text-lg leading-7 text-gray-400">{t('pages.auth.everId.EMAIL_UNVERIFIED_BODY')}</Text>
			<div className="flex flex-wrap gap-3 justify-center">
				{/* A full page load: the route answers with a redirect to Ever ID. */}
				<Button asChild className="px-7 font-normal rounded-lg">
					<a href={VERIFY_EMAIL_ROUTE}>{t('pages.auth.everId.VERIFY_EMAIL')}</a>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="px-7 font-normal rounded-lg"
					onClick={restartEverIdSignIn}
				>
					{t('pages.auth.everId.SIGN_IN_AGAIN')}
				</Button>
			</div>
			<Link href={DEFAULT_APP_PATH} className="text-sm underline text-gray-400 underline-offset-4">
				{t('pages.auth.everId.SIGN_IN_ANOTHER_WAY')}
			</Link>
		</div>
	);
}
