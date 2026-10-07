import { IssuesView } from '@/core/constants/config/constants';
import { Container } from '@/core/components';
import {
	LazyUserTeamCardHeader,
	LazyUserTeamTableHeader,
	LazyUserTeamBlockHeader
} from '@/core/components/optimized-components/teams';
const viewRenderMap = {
	[IssuesView.CARDS]: LazyUserTeamCardHeader,
	[IssuesView.TABLE]: LazyUserTeamTableHeader,
	[IssuesView.BLOCKS]: LazyUserTeamBlockHeader
};
function TeamMemberHeader({ view }: { view: IssuesView }) {
	const HeaderComponent = viewRenderMap[view as keyof typeof viewRenderMap] || LazyUserTeamCardHeader;
	return (
		<Container className="!p-0">
			<HeaderComponent />
		</Container>
	);
}

export default TeamMemberHeader;
