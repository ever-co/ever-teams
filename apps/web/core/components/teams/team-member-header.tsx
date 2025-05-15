import { IssuesView } from '@/core/constants/config/constants';
import { UserTeamCardHeader } from '../pages/teams/team/team-members-views/team-members-header';
import { Container } from '@/core/components';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/fullWidth';
import UserTeamTableHeader from '../pages/teams/team/team-members-views/user-team-table/user-team-table-header';
import { UserTeamBlockHeader } from '../pages/teams/team/team-members-views/user-team-block/user-team-block-header';

function TeamMemberHeader({ view }: { view: IssuesView }) {
	const fullWidth = useAtomValue(fullWidthState);
	let header;
	switch (true) {
		case view == IssuesView.CARDS:
			header = <UserTeamCardHeader />;
			break;
		case view == IssuesView.TABLE:
			header = <UserTeamTableHeader />;
			break;
		case view == IssuesView.BLOCKS:
			header = <UserTeamBlockHeader />;
			break;
		default:
			header = <UserTeamCardHeader />;
			break;
	}
	return (
		<Container fullWidth={fullWidth} className="!p-0">
			{header}
		</Container>
	);
}

export default TeamMemberHeader;
