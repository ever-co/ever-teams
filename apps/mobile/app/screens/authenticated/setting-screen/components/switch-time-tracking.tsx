/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { useStores } from '../../../../models';
import { translate } from '../../../../i18n';
import { limitTextCharaters } from '../../../../helpers/sub-text';
import { Toggle } from '../../../../components/toggle';
import { SettingsRow } from './settings-kit';

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
				<Toggle
					inputInnerStyle={{ backgroundColor: '#DBD3FA' }}
					inputDetailStyle={{ backgroundColor: '#3826A6' }}
					onPress={() => toggleSwitch()}
					variant="switch"
					value={isEnabled}
				/>
			}
		/>
	);
});

export default SwitchTimeTracking;
