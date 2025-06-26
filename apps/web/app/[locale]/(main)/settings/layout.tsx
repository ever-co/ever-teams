'use client';
import { userState } from '@/core/stores';
import { fullWidthState } from '@/core/stores/common/full-width';
import SettingsPageSkeleton, {
	LeftSideSettingMenuSkeleton
} from '@/core/components/common/skeleton/settings-page-skeleton';
import { Container } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAtom, useAtomValue } from 'jotai';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { usePathname } from 'next/navigation';
import { useAuthenticateUser, useOrganizationTeams } from '@/core/hooks';
import { cn } from '@/core/lib/helpers';
import { ReactNode } from 'react';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import dynamic from 'next/dynamic';
const LazyLeftSideSettingMenu = dynamic(
	() =>
		import('@/core/components/pages/settings/left-side-setting-menu').then((mod) => ({
			default: mod.LeftSideSettingMenu
		})),
	{
		ssr: false,
		loading: () => <LeftSideSettingMenuSkeleton />
	}
);
const SettingsLayout = ({ children }: { children: ReactNode }) => {
	const t = useTranslations();
	const { user, userLoading } = useAuthenticateUser();
	const fullWidth = useAtomValue(fullWidthState);
	const pathName = usePathname();

	const getEndPath: any = pathName?.split('settings/')[1];
	const endWord: 'TEAM' | 'PERSONAL' = getEndPath?.toUpperCase();
	const breadcrumb = [
		{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
		{ title: t('common.SETTINGS'), href: pathName as string },
		{ title: t(`common.${endWord}`), href: pathName as string }
	];

	if (userLoading && !user) {
		return <SettingsPageSkeleton showTimer={false} fullWidth={fullWidth} />;
	}

	const { isTrackingEnabled } = useOrganizationTeams();

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="overflow-hidden items-start pb-1 w-full"
			childrenClassName="h-[calc(100vh-_300px)] overflow-hidden w-full !min-h-fit"
			mainHeaderSlot={
				<div className="py-6 w-full bg-white dark:bg-dark--theme">
					<Container
						fullWidth={fullWidth}
						className={cn('flex flex-row gap-8 justify-start items-center w-full')}
					>
						<Link href="/">
							<ArrowLeftIcon className="w-6 h-6" />
						</Link>

						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className={cn('!p-0 w-full')}>
				<div className="flex w-full">
					<LazyLeftSideSettingMenu />
					<div className="h-[calc(100svh-_291px)] mt-3 px-5 overflow-y-auto w-full">{children}</div>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(SettingsLayout, { displayName: 'Settings' });
