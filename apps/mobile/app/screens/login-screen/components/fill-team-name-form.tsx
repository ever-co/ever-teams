import React, { FC, ReactNode, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';

// Components
import { translate } from '../../../i18n';
import { typography, useWebTheme } from '../../../theme';
import { useStores } from '../../../models';
import { SignInStep } from './sign-in-step';
import { SignInField } from './sign-in-field';

interface Props {
	isLoading: boolean;
	errors: any;
	setWithTeam: (value: boolean) => unknown;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	/** The step's title and its line, drawn above the fields. */
	heading?: ReactNode;
}

const TEAM_NAME_MIN_LENGTH = 3;

const FillTeamNameForm: FC<Props> = observer(({ isLoading, errors, setScreenStatus, setWithTeam, heading }) => {
	const authTeamInput = useRef<TextInput | null>(null);
	const theme = useWebTheme();

	const {
		authenticationStore: { authTeamName, setAuthTeamName }
	} = useStores();

	const isTeamNameShort = authTeamName.length < TEAM_NAME_MIN_LENGTH;

	return (
		<SignInStep
			heading={heading}
			submit={{
				label: translate('loginScreen.tapContinue'),
				onPress: () =>
					setScreenStatus({
						screen: 2,
						animation: true
					}),
				disabled: isTeamNameShort,
				isLoading: false
			}}
			footer={
				<TouchableOpacity
					accessibilityRole="button"
					style={styles.switchLink}
					onPress={() => setWithTeam(true)}
				>
					<Text style={[styles.switchText, { color: theme.colors['primary-ink'] }]}>
						{translate('loginScreen.joinExistTeam')}
					</Text>
				</TouchableOpacity>
			}
		>
			<SignInField
				label={translate('loginScreen.step1Title')}
				placeholder={translate('loginScreen.teamNameFieldPlaceholder')}
				ref={authTeamInput}
				value={authTeamName}
				onChangeText={setAuthTeamName}
				autoCapitalize="none"
				autoCorrect={false}
				editable={!isLoading}
				helper={errors?.authTeamName}
				status={errors?.authTeamName ? 'error' : undefined}
				onSubmitEditing={() => authTeamInput.current?.focus()}
			/>
		</SignInStep>
	);
});

export default FillTeamNameForm;

const styles = StyleSheet.create({
	switchLink: {
		alignSelf: 'center',
		marginTop: 16,
		minHeight: 24
	},
	switchText: {
		fontFamily: typography.primary.medium,
		fontSize: 14
	}
});
