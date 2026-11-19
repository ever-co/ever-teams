import React, { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { translate } from '../../../../i18n';
import { SettingsRow, SettingsSwitch } from './settings-kit';

function teamTypeOf(isTeamPublic: boolean): string {
	if (isTeamPublic) {
		return translate('settingScreen.teamSection.publicTeam');
	}
	return translate('settingScreen.teamSection.privateTeam');
}

interface Props {}
const SwitchTeamPublicity: FC<Props> = observer(() => {
	const { onUpdateOrganizationTeam, currentTeam, activeTeam } = useOrganizationTeam();

	const [isTeamPublic, setIsTeamPublic] = useState<boolean>(activeTeam?.public);

	const toggleSwitch = useCallback(async () => {
		await onUpdateOrganizationTeam({
			id: currentTeam?.id,
			data: { ...currentTeam, public: !isTeamPublic }
		}).then(() => setIsTeamPublic((prev) => !prev));
	}, [isTeamPublic, currentTeam]);

	useEffect(() => {
		setIsTeamPublic(activeTeam?.public);
	}, [currentTeam]);
	return (
		<SettingsRow
			label={translate('settingScreen.teamSection.teamType')}
			description={teamTypeOf(isTeamPublic)}
			trailing={
				<SettingsSwitch
					value={isTeamPublic}
					onPress={() => toggleSwitch()}
					accessibilityLabel={translate('settingScreen.teamSection.teamType')}
				/>
			}
		/>
	);
});

export default SwitchTeamPublicity;
