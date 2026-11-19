import React, { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { useStores } from '../../../../models';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { SettingsRow, SettingsSwitch } from './settings-kit';

interface Props {}
const SwitchTimeTracking: FC<Props> = observer(() => {
	const { currentUser, toggleTimeTracking } = useOrganizationTeam();
	const {
		teamStore: { setIsTrackingEnabled }
	} = useStores();
	const [isEnabled, setIsEnabled] = useState(currentUser?.isTrackingEnabled);

	const toggleSwitch = useCallback(async () => {
		const { response } = await toggleTimeTracking(currentUser, !isEnabled);
		if (response.ok) {
			setIsEnabled((prev) => !prev);
		}
	}, [currentUser, isEnabled]);

	useEffect(() => {
		setIsTrackingEnabled(currentUser?.isTrackingEnabled);
		setIsEnabled(currentUser?.isTrackingEnabled);
	}, [currentUser]);
	return (
		<SettingsRow
			label={translate('settingScreen.teamSection.timeTracking')}
			description={limitTextCharaters({
				text: translate('settingScreen.teamSection.timeTrackingHint'),
				numChars: 77
			})}
			trailing={
				<SettingsSwitch
					value={isEnabled}
					onPress={() => toggleSwitch()}
					accessibilityLabel={translate('settingScreen.teamSection.timeTracking')}
				/>
			}
		/>
	);
});

export default SwitchTimeTracking;
