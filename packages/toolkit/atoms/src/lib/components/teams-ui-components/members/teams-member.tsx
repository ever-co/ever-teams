import { MemberTeams } from '@components/teams-report/basic-member/teams-member';

interface IMemberTeamsProps {
	size?: 'default' | 'sm' | 'lg';
	showProgress?: boolean;
	showTime?: boolean;
	className?: string;
	seconds: number;
}
export const TeamsMember = ({ seconds, ...props }: IMemberTeamsProps) => {
	return <MemberTeams seconds={seconds} {...props} />;
};
