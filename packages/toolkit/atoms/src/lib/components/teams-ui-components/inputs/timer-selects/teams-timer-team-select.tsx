import { Select, Tooltip } from '@ever-teams/toolkit-ui';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTranslation } from 'react-i18next';
import { useOrganizationTeams } from '@hooks/useOrganizationTeams';

export const TeamsTimerTeamSelect = ({
	size,
	isTimerRunning,
	currentTeamsState,
	setCurrentTeamsState
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	isTimerRunning?: boolean;
	currentTeamsState: ICurrentTeamsState;
	setCurrentTeamsState: React.Dispatch<React.SetStateAction<ICurrentTeamsState>>;
}) => {
	const { t } = useTranslation();

	const { data: teams, loading: organisationsLoading } = useOrganizationTeams({
		projectId: currentTeamsState?.projectId || null
	});

	return (
		<div className=" flex flex-col gap-2 ">
			<label htmlFor="team" className="text-sm ">
				{t('COMMON.team')}
			</label>
			<Tooltip
				placement="auto"
				message={isTimerRunning ? t('WARNING.stop_timer_before_selecting', { item: t('COMMON.team') }) : ''}
			>
				<Select
					loading={organisationsLoading}
					name="team"
					size={size}
					placeholder={t('INPUT.team_select.select_team')}
					disabled={isTimerRunning}
					value={currentTeamsState?.organizationTeamId || undefined}
					defaultValue={currentTeamsState?.organizationTeamId || undefined}
					values={
						teams
							? teams?.items.map((team) => {
									return { label: team.name, value: team.id };
								})
							: undefined
					}
					onValueChange={(e) => {
						setCurrentTeamsState((state: ICurrentTeamsState) => {
							return {
								...state,
								organizationTeamId: e
							};
						});
					}}
				/>
			</Tooltip>
		</div>
	);
};
