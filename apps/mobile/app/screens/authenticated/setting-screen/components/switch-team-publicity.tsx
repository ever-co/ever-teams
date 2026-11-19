/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { translate } from '../../../../i18n';
import { Toggle } from '../../../../components/toggle';
import { SettingsRow } from './settings-kit';

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
				<Toggle
					inputInnerStyle={{ backgroundColor: '#DBD3FA' }}
					inputDetailStyle={{ backgroundColor: '#3826A6' }}
					onPress={() => toggleSwitch()}
					variant="switch"
					value={isTeamPublic}
				/>
			}
		/>
	);
});

export default SwitchTeamPublicity;
