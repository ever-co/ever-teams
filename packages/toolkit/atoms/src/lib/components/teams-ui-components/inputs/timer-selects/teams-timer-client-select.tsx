import { Select, Tooltip } from '@ever-teams/toolkit-ui';
import { ICurrentTeamsState } from '@ever-teams/toolkit-types';
import { useTranslation } from 'react-i18next';
import { useEmployeeOrganization } from '@hooks/useEmployeeOrganisation';

export const TeamsTimerClientSelect = ({
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

	const { data: organizationClients, loading: clientsLoading } = useEmployeeOrganization();

	return (
		<div className=" flex flex-col gap-2 ">
			<label htmlFor="client" className="text-sm ">
				{t('COMMON.client')}
			</label>
			<Tooltip
				message={isTimerRunning ? t('WARNING.stop_timer_before_selecting', { item: t('COMMON.client') }) : ''}
			>
				<Select
					loading={clientsLoading}
					name="client"
					disabled={isTimerRunning}
					size={size}
					placeholder={t('INPUT.client_select.select_client')}
					value={currentTeamsState?.clientId || undefined}
					defaultValue={currentTeamsState?.clientId || undefined}
					values={
						organizationClients && organizationClients[0]
							? organizationClients?.map((client) => {
									return { value: client.id, label: client.name };
								})
							: undefined
					}
					onValueChange={(e) => {
						setCurrentTeamsState((state: ICurrentTeamsState) => {
							return {
								...state,
								clientId: e
							};
						});
					}}
					onClear={() => {
						setCurrentTeamsState((state: ICurrentTeamsState) => {
							return {
								...state,
								clientId: null
							};
						});
					}}
				/>
			</Tooltip>
		</div>
	);
};
