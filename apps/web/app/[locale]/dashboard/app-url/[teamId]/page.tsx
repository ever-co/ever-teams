"use client"
import { fullWidthState } from '@/app/stores/fullWidth';
import { withAuthentication } from '@/lib/app/authenticator';
import { MainLayout } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { useOrganizationTeams } from '@app/hooks/features/useOrganizationTeams';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import React, { useMemo } from 'react';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useRouter } from 'next/navigation';
import { Breadcrumb, Container } from '@/lib/components';

 function AppUrls() {
	const { activeTeam, isTrackingEnabled } = useOrganizationTeams();
	const router = useRouter();
	const t = useTranslations();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: activeTeam?.name || '', href: '/' },
			{ title: 'Apps & URLs', href: `/${currentLocale}/dashboard/app-url` }
		],
		[activeTeam?.name, currentLocale, t]
	);

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex gap-4 items-center w-full')}>
						<div className="flex items-center pt-6 w-full dark:bg-dark--theme">
							<button
								onClick={() => router.back()}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
                </button>
              <Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
					</Container>
				</div>
			}
		></MainLayout>
	);
}

export default withAuthentication(AppUrls, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true
});
