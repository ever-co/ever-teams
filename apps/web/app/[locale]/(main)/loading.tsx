'use client';

import { usePathname } from 'next/navigation';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { HomePageSkeleton } from '@/core/components/pages/teams/team/home-page-skeleton';
import { APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';

function isHomePath(pathname: string) {
	const segments = pathname.split('/').filter(Boolean);
	const isRoot = segments.length === 0;
	const isSingleSegment = segments.length === 1;
	const isLocaleRoot = isSingleSegment && APPLICATION_LANGUAGES_CODE.includes(segments[0]);
	return isRoot || isLocaleRoot;
}

/**
 * The home page has no folder of its own, so this boundary is its loading state. Every other route of the group
 * brings its own `loading.tsx`; one that does not gets the bare frame, never another page's skeleton.
 */
export default function MainLoading() {
	const pathname = usePathname();
	const isHome = isHomePath(pathname);
	if (isHome) {
		return <HomePageSkeleton />;
	}
	return <PageSkeletonFrame />;
}
