import { IssuesView } from '@app/constants';
import React from 'react';
import { UserTeamCardHeader } from './team/user-team-card/task-skeleton';
import { UserTeamBlockHeader } from './team/user-team-block/user-team-block-header';
import { Container } from 'lib/components';
import { useRecoilValue } from 'recoil';
import { fullWidthState } from '@app/stores/fullWidth';

function TeamMemberHeader({ view }: { view: IssuesView }) {
	const fullWidth = useRecoilValue(fullWidthState);
	let header;
	switch (true) {
		case view == IssuesView.CARDS:
			header = <UserTeamCardHeader />;
			break;
		case view == IssuesView.TABLE:
			header = <></>;
			break;
		case view == IssuesView.BLOCKS:
			header = <UserTeamBlockHeader />;
			break;
		default:
			header = <UserTeamCardHeader />;
			break;
	}
	return (
		<Container fullWidth={fullWidth} className="!pb-0">
			{header}
		</Container>
	);
}

export default TeamMemberHeader;
