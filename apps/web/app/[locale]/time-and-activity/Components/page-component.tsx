'use client';
import { withAuthentication } from '@/lib/app/authenticator';
import { MainLayout } from '@/lib/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/app/stores/fullWidth';
import { useParams } from 'next/navigation';
import { useOrganizationTeams } from '@app/hooks';
import { Breadcrumb, Container } from '@/lib/components';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useMemo } from 'react';
import TimeActivityHeader from './time-activity-header';
import CardTimeandActivity from './card-time-and-activity';

const TimectivityComponents = () => {
	const t = useTranslations();
	const router = useRouter();
	const fullWidth = useAtomValue(fullWidthState);
	const paramsUrl = useParams<{ locale: string }>();
	const currentLocale = paramsUrl?.locale;
	const { isTrackingEnabled } = useOrganizationTeams();

	const breadcrumbPath = useMemo(
		() => [
			{ title: JSON.parse(t('pages.home.BREADCRUMB')), href: '/' },
			{ title: 'Time and Activity', href: `/${currentLocale}/time-and-activity` }
		],
		[currentLocale, t]
	);

	const handleBack = () => router.back();

	return (
		<MainLayout
			className="items-start pb-1 !overflow-hidden w-full"
			childrenClassName="w-full"
			showTimer={isTrackingEnabled}
			mainHeaderSlot={
				<div className="flex flex-col pb-4 bg-gray-100 dark:bg-dark--theme">
					<Container fullWidth={fullWidth} className={cn('flex flex-col gap-4 items-center w-full')}>
						<div className="flex items-center pt-6 w-full">
							<button
								onClick={handleBack}
								className="p-1 rounded-full transition-colors hover:bg-gray-100"
							>
								<ArrowLeftIcon className="text-dark dark:text-[#6b7280] h-6 w-6" />
							</button>
							<Breadcrumb paths={breadcrumbPath} className="text-sm" />
						</div>
						<div className="flex flex-col gap-6 w-full">
							<TimeActivityHeader />
							<div className="grid grid-cols-3 gap-[30px] w-full">
								<CardTimeandActivity
									title="Total Hours"
									value="1,020h"
									showProgress={false}
								/>
								<CardTimeandActivity
									title="Average Activity"
									value="74%"
									showProgress={true}
									progress={74}
									progressColor="bg-[#0088CC]"
									isLoading={false}
								/>
								<CardTimeandActivity
									title="Total Earnings"
									value="1,200.00 USD"
									showProgress={false}
								/>
							</div>
						</div>
					</Container>
				</div>
			}
		></MainLayout>
	);
};

export default withAuthentication(TimectivityComponents, { displayName: 'Time and Activity' });
