import React, { FC, ReactNode, useRef } from 'react';
import { TextInput } from 'react-native';
import { observer } from 'mobx-react-lite';

import { translate } from '../../../i18n';
import { useStores } from '../../../models';
import { SignInStep } from './sign-in-step';
import { SignInField } from './sign-in-field';

interface Props {
	isLoading: boolean;
	errors: any;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	createNewTeam: () => unknown;
	/** The step's title and its line, drawn above the fields. */
	heading?: ReactNode;
}

const FillUserInfoForm: FC<Props> = observer(({ isLoading, errors, setScreenStatus, createNewTeam, heading }) => {
	const authTeamInput = useRef<TextInput | null>(null);

	const {
		authenticationStore: { authEmail, setAuthEmail, authUsername, setAuthUsername }
	} = useStores();

	return (
		<SignInStep
			heading={heading}
			onBack={() =>
				setScreenStatus({
					screen: 1,
					animation: true
				})
			}
			submit={{
				label: translate('loginScreen.createTeam'),
				onPress: () => createNewTeam(),
				disabled: false,
				isLoading
			}}
		>
			<SignInField
				label={translate('settingScreen.personalSection.fullName')}
				placeholder={translate('loginScreen.userNameFieldPlaceholder')}
				ref={authTeamInput}
				value={authUsername}
				onChangeText={setAuthUsername}
				autoCapitalize="none"
				autoCorrect={false}
				editable={!isLoading}
				helper={errors?.authUsername}
				status={errors?.authUsername ? 'error' : undefined}
				onSubmitEditing={() => authTeamInput.current?.focus()}
			/>
			<SignInField
				label={translate('loginScreen.emailFieldLabel')}
				placeholder={translate('loginScreen.emailFieldPlaceholder')}
				ref={authTeamInput}
				value={authEmail}
				onChangeText={setAuthEmail}
				autoCapitalize="none"
				autoCorrect={false}
				editable={!isLoading}
				helper={errors?.authEmail}
				status={errors?.authEmail ? 'error' : undefined}
				onSubmitEditing={() => authTeamInput.current?.focus()}
			/>
		</SignInStep>
	);
});

export default FillUserInfoForm;
