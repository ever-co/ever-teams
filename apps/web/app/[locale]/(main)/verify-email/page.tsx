'use client';

import Link from 'next/link';
import { useEmailVerifyToken } from '@/core/hooks';
import { BackdropLoader, Button, Text } from '@/core/components';
import { PageLayout } from '@/core/components/layouts/default-layout';

import { useTranslations } from 'next-intl';

const VerifyEmail = () => {
	const { loading, failed } = useEmailVerifyToken();
	const t = useTranslations();

	return (
		<PageLayout>
			<BackdropLoader show={loading} title={t('pages.authTeam.VERIFY_EMAIL_LOADING_TEXT')} />

			{failed && (
				<div className="flex flex-col gap-5 items-center px-4 py-20 text-center">
					<Text.Heading as="h1">{t('pages.authTeam.VERIFY_EMAIL_FAILED_TITLE')}</Text.Heading>

					<Text className="max-w-md text-muted-foreground">
						{t('pages.authTeam.VERIFY_EMAIL_FAILED_MESSAGE')}
					</Text>

					<Button className="font-normal rounded-lg" variant="outline" asChild>
						<Link href="/">{t('pages.profile.GO_TO_HOME')}</Link>
					</Button>
				</div>
			)}
		</PageLayout>
	);
};

export default VerifyEmail;
