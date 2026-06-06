import { cn, Select } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';
import { useOrganizationTeams } from '@hooks/useOrganizationTeams';
import { IOrganizationTeamList } from '@ever-teams/toolkit-types';

export const TeamsActiveTeamSelector = ({
	size,
	label,
	className,
	containerClassName
}: {
	size?: 'default' | 'sm' | 'lg' | null;
	label?: string;
	className?: string;
	containerClassName?: string;
}) => {
	const { setSelectedTeam, selectedTeam } = useTeamsContext();

	const { data: teams, loading: organisationsLoading } = useOrganizationTeams({
		projectId: null
	});

	const { t } = useTranslation();

	return (
		<div className={cn(`flex flex-col gap-2`, containerClassName)}>
			{label && (
				<label htmlFor="team" className="text-sm text-foreground">
					{label}
				</label>
			)}
			<Select
				loading={organisationsLoading}
				className={className}
				name="team"
				size={size}
				placeholder={t('INPUT.team_select.select_team')}
				disabled={organisationsLoading}
				value={selectedTeam}
				defaultValue={selectedTeam}
				values={
					teams
						? [
								{ label: 'All teams', value: 'all' },
								...teams?.items.map((team: IOrganizationTeamList) => {
									return { label: team.name + ` (${team.members?.length || 0})`, value: team?.id };
								})
							]
						: [{ label: 'All teams', value: 'all' }]
				}
				onValueChange={(e) => {
					setSelectedTeam(e);
				}}
			/>
		</div>
	);
};
