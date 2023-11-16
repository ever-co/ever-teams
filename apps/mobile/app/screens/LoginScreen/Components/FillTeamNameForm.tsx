/* eslint-disable react-native/no-inline-styles */
import React, { FC, useRef } from 'react';
import { View, Text, Dimensions, TextInput, ViewStyle, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import * as Animatable from 'react-native-animatable';
import EStyleSheet from 'react-native-extended-stylesheet';

// Components
import { translate } from '../../../i18n';
import { Button, TextField } from '../../../components';
import { spacing, typography, useAppTheme } from '../../../theme';
import { useStores } from '../../../models';
import { GLOBAL_STYLE as GS } from '../../../../assets/ts/styles';

interface Props {
	isLoading: boolean;
	errors: any;
	setWithTeam: (value: boolean) => unknown;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
}

const FillTeamNameForm: FC<Props> = observer(({ isLoading, errors, setScreenStatus, setWithTeam }) => {
	const authTeamInput = useRef<TextInput>();

	const { colors, dark } = useAppTheme();

	const {
		authenticationStore: { authTeamName, setAuthTeamName }
	} = useStores();

	return (
		<Animatable.View
			animation={'zoomIn'}
			delay={100}
			style={{
				...styles.form,
				backgroundColor: colors.background,
				...(!dark && GS.shadowSm)
			}}
		>
			<Text style={{ ...styles.text, color: colors.primary }}>{translate('loginScreen.step1Title')}</Text>
			<TextField
				placeholder={translate('loginScreen.teamNameFieldPlaceholder')}
				containerStyle={styles.textField}
				placeholderTextColor={dark ? '#7B8089' : '#28204866'}
				inputWrapperStyle={{
					...styles.inputStyleOverride,
					backgroundColor: colors.background,
					borderColor: colors.border
				}}
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
			<View style={styles.buttonsView}>
				<TouchableOpacity style={{ width: 130 }} onPress={() => setWithTeam(true)}>
					<Text style={{ ...styles.joinExistedText, color: colors.secondary }}>
						{translate('loginScreen.joinExistTeam')}
					</Text>
				</TouchableOpacity>
				<Button
					style={{
						...$tapButton,
						opacity: authTeamName.length < 3 ? 0.5 : 1,
						backgroundColor: colors.secondary,
						borderWidth: 0
					}}
					textStyle={styles.tapButtonText}
					onPress={() =>
						setScreenStatus({
							screen: 2,
							animation: true
						})
					}
					disabled={authTeamName.length < 3}
				>
					<Text>{translate('loginScreen.tapContinue')}</Text>
				</Button>
			</View>
		</Animatable.View>
	);
});

export default FillTeamNameForm;

const { width } = Dimensions.get('window');

const $tapButton: ViewStyle = {
	marginTop: spacing.extraSmall,
	width: width / 3,
	borderRadius: 10
	// backgroundColor: '#3826A6'
};

const styles = EStyleSheet.create({
	form: {
		position: 'absolute',
		display: 'flex',
		flex: 1,
		width: '90%',
		top: '-32%',
		padding: '1.5rem',
		alignSelf: 'center',
		backgroundColor: '#fff',
		alignItems: 'center',
		borderRadius: '1rem',
		justifyContent: 'flex-start',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.1)',
		zIndex: 1000
	},
	text: {
		fontSize: '1.5rem',
		marginBottom: '2rem',
		color: '#1A1C1E',
		width: '100%',
		textAlign: 'center',
		fontFamily: typography.primary.semiBold
	},
	buttonsView: {
		width: '100%',
		display: 'flex',
		marginTop: '2rem',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	inputStyleOverride: {
		height: '3.3rem',
		borderColor: 'rgba(0,0,0,0.1)',
		backgroundColor: '#FFFFFF',
		paddingVertical: '0.43rem',
		paddingHorizontal: '0.6rem',
		borderRadius: '0.6rem'
	},
	textField: {
		width: '100%',
		borderRadius: '1.25rem'
	},
	joinExistedText: {
		fontSize: '0.75rem',
		fontFamily: typography.primary.semiBold
	},
	tapButtonText: {
		color: '#fff',
		fontFamily: typography.primary.semiBold,
		fontSize: '1rem'
	}
});
