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
import { Card } from '@components/ui/card';
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
							<Card className="p-8 px-0 py-0 rounded-xl border border-gray-100 dark:border-gray-700 dark:bg-dark h-[245px] theme-light h-">
								<div className="flex flex-col gap-6 w-full">
									<div className="flex justify-between items-center h-[105px] w-full  pl-8">
										<CardTimeandActivity
											title="Total Hours"
											value="1,020h"
											showProgress={false}
											progress={75}
										/>
										<CardTimeandActivity
											title="Average Activity"
											value="74%"
											showProgress={true}
											progress={74}
											progressColor="bg-blue-500"
											isLoading={false}
										/>
										<CardTimeandActivity
											title="Total Earnings"
											value="1,200.00 USD"
											showProgress={false}
											progress={75}

										/>
									</div>
									<div className="flex flex-col px-8 w-full"></div>
								</div>
							</Card>
						</div>
					</Container>
				</div>
			}
		></MainLayout>
	);
};

export default withAuthentication(TimectivityComponents, { displayName: 'Time and Activity' });
