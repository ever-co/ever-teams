import { IssuesView } from '@app/constants';
import { UserTeamCardHeader } from './team/user-team-card/task-skeleton';
import { UserTeamBlockHeader } from './team/user-team-block/user-team-block-header';
import { Container } from 'lib/components';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@app/stores/fullWidth';
import UserTeamTableHeader from './team/user-team-table/user-team-table-header';

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
