'use client';
import SettingsPageSkeleton from '@/core/components/common/skeleton/settings-page-skeleton';
import { Container } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAtomValue } from 'jotai';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { usePathname } from 'next/navigation';
import { cn } from '@/core/lib/helpers';
import { ReactNode } from 'react';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
// Import optimized components from centralized location
import { LazyLeftSideSettingMenu } from '@/core/components/optimized-components/settings';
import { isTrackingEnabledState } from '@/core/stores';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { SettingsFrame } from '@/core/components/pages/settings/settings-frame';
const SettingsLayout = ({ children }: { children: ReactNode }) => {
	const t = useTranslations();
	const { data: user, isFetching: userLoading } = useUserQuery();
	const pathName = usePathname();

	const getEndPath: any = pathName?.split('settings/')[1];
	const endWord: 'TEAM' | 'PERSONAL' = getEndPath?.toUpperCase();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.SETTINGS'), href: pathName as string },
		{ title: t(`common.${endWord}`), href: pathName as string }
	];

	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);

	if (userLoading && !user) {
		return <SettingsPageSkeleton showTimer={false} />;
	}

	return (
		<PageLayout
			showTimer={isTrackingEnabled}
			className="items-start !p-0 w-full"
			childrenClassName="w-full"
			mainHeaderSlot={
				<div className="py-3 w-full bg-white dark:bg-dark-high">
					<Container className={cn('flex flex-row gap-4 justify-start items-center w-full')}>
						<Link href="/">
							<ArrowLeftIcon className="w-6 h-6" />
						</Link>

						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</Container>
				</div>
			}
		>
			<Container>
				<SettingsFrame navigation={<LazyLeftSideSettingMenu />}>{children}</SettingsFrame>
			</Container>
		</PageLayout>
	);
};

export default withAuthentication(SettingsLayout, { displayName: 'Settings' });
