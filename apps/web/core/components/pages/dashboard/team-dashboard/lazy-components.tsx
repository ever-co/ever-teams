import { DashboardHeaderSkeleton } from '@/core/components/common/skeleton/dashboard-header-skeleton';
import dynamic from 'next/dynamic';

export const LazyDashboardHeader = dynamic(
	() =>
		import('@/core/components/pages/dashboard/dashboard-header').then((mod) => ({
			default: mod.DashboardHeader
		})),
	{
		ssr: false,
		loading: () => <DashboardHeaderSkeleton />
	}
);
