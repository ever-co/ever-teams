import { IssuesView } from '@/core/constants/config/constants';
import { Container } from '@/core/components';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import dynamic from 'next/dynamic';

// Optimized lazy loading according to Medium article - unified loading states
const LazyUserTeamCardHeader = dynamic(
	() =>
		import('../pages/teams/team/team-members-views/team-members-header').then((mod) => ({
			default: mod.UserTeamCardHeader
		})),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);

const LazyUserTeamTableHeader = dynamic(
	() => import('../pages/teams/team/team-members-views/user-team-table/user-team-table-header'),
	{
		ssr: false
		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);

const LazyUserTeamBlockHeader = dynamic(
	() =>
		import('../pages/teams/team/team-members-views/user-team-block/user-team-block-header').then((mod) => ({
			default: mod.UserTeamBlockHeader
		})),
	{
		ssr: false

		// Note: Removed loading here to avoid double loading states
		// Parent component's Suspense fallback will handle all loading states uniformly
	}
);
const viewRenderMap = {
	[IssuesView.CARDS]: LazyUserTeamCardHeader,
	[IssuesView.TABLE]: LazyUserTeamTableHeader,
	[IssuesView.BLOCKS]: LazyUserTeamBlockHeader
};
function TeamMemberHeader({ view }: { view: IssuesView }) {
	const fullWidth = useAtomValue(fullWidthState);
	const HeaderComponent = viewRenderMap[view as keyof typeof viewRenderMap];
	return (
		<Container fullWidth={fullWidth} className="!p-0">
			<HeaderComponent />
		</Container>
	);
}

export default TeamMemberHeader;
