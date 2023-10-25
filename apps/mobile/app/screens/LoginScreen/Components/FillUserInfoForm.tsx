/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useRef } from 'react';
import * as Animatable from 'react-native-animatable';
import EStyleSheet from 'react-native-extended-stylesheet';
import { View, Text, Dimensions, TextInput, ViewStyle, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native-paper';

import { translate } from '../../../i18n';
import { Button, TextField } from '../../../components';
import { spacing, typography } from '../../../theme';
import { useStores } from '../../../models';
import { GLOBAL_STYLE as GS } from '../../../../assets/ts/styles';

interface Props {
	isLoading: boolean;
	errors: any;
	setScreenStatus: (value: { screen: number; animation: boolean }) => unknown;
	createNewTeam: () => unknown;
}

const FillUserInfoForm: FC<Props> = observer(({ isLoading, errors, setScreenStatus, createNewTeam }) => {
	const authTeamInput = useRef<TextInput>();

	const {
		authenticationStore: { authEmail, setAuthEmail, authUsername, setAuthUsername }
	} = useStores();

	return (
		<Animatable.View animation={'zoomIn'} delay={100} style={styles.form}>
			<Text style={styles.text}>{translate('loginScreen.step2Title')}</Text>
			<TextField
				placeholder={translate('loginScreen.userNameFieldPlaceholder')}
				containerStyle={styles.textField}
				placeholderTextColor={'rgba(40, 32, 72, 0.4)'}
				inputWrapperStyle={styles.inputStyleOverride}
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
			<TextField
				placeholder={translate('loginScreen.emailFieldPlaceholder')}
				containerStyle={[styles.textField, { marginTop: 20 }]}
				placeholderTextColor={'rgba(40, 32, 72, 0.4)'}
				inputWrapperStyle={styles.inputStyleOverride}
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
			<View style={styles.buttonsView}>
				<TouchableOpacity
					style={{
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						width: 65
					}}
					onPress={() =>
						setScreenStatus({
							screen: 1,
							animation: true
						})
					}
				>
					<Feather name="arrow-left" size={24} color={'#3826A6'} />
					<Text style={[styles.backButtonText, { color: '#282048', fontSize: 14 }]}>
						{translate('common.back')}
					</Text>
				</TouchableOpacity>
				<Button
					style={[$tapButton, { width: width / 2.1, opacity: isLoading ? 0.5 : 1 }]}
					textStyle={styles.tapButtonText}
					onPress={() => createNewTeam()}
				>
					<Text>{translate('loginScreen.createTeam')}</Text>
				</Button>
				<ActivityIndicator
					style={[styles.loading, { marginRight: 8 }]}
					animating={isLoading}
					size={'small'}
					color={'#fff'}
				/>
			</View>
		</Animatable.View>
	);
});

export default FillUserInfoForm;

const { width } = Dimensions.get('window');

const $tapButton: ViewStyle = {
	marginTop: spacing.extraSmall,
	width: width / 3,
	borderRadius: 10,
	backgroundColor: '#3826A6'
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
		zIndex: 1000,
		...GS.shadowSm
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
	backButtonText: {
		fontSize: '0.87rem',
		fontFamily: typography.primary.semiBold,
		color: '#3826A6'
	},
	tapButtonText: {
		color: '#fff',
		fontFamily: typography.primary.semiBold,
		fontSize: '1rem'
	},
	loading: {
		position: 'absolute',
		bottom: '20%',
		right: '47%'
	}
});
