'use client';

import { useOrganizationTeams } from '@/app/hooks';
import { fullWidthState } from '@/app/stores/fullWidth';
import { ArrowLeftIcon } from '@/assets/svg';
import { withAuthentication } from '@/lib/app/authenticator';
import { Breadcrumb, Container } from '@/lib/components';
import { MainLayout } from '@/lib/layout';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useMemo } from 'react';

function WeeklyLimitReport() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const fullWidth = useAtomValue(fullWidthState);

	const breadcrumbPath = useMemo(
		() => [
			{ title: 'Reports', href: '#' },
			{ title: 'Weekly Limit', href: '#' }
		],
		[]
	);

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col py-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className="flex flex-col gap-y-2">
						<div className="flex flex-row items-start justify-between">
							<div className="flex items-center justify-center h-10 gap-8">
								<Link href="/">
									<ArrowLeftIcon className="w-6 h-6" />
								</Link>
								<Breadcrumb paths={breadcrumbPath} className="text-sm" />
							</div>
						</div>
					</Container>
				</div>
			}
		>
			<div className="flex flex-col h-full  w-full border-1 rounded-lg bg-[#FFFFFF]  dark:bg-dark--theme border border-red-500">
				<Container fullWidth={fullWidth}>Weekly time limit</Container>
			</div>
		</MainLayout>
	);
}

export default withAuthentication(WeeklyLimitReport, { displayName: 'WeeklyLimitReport' });
