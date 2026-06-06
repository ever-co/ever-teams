import { TeamsEssentialTimer, TeamsEssentialTimerProps } from '@ever-teams/atoms';

export function TeamsBasicProgress({ progress, ...props }: Readonly<TeamsEssentialTimerProps>) {
	return <TeamsEssentialTimer {...props} />;
}
