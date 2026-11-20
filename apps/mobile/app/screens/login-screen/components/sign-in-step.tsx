import React, { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { translate } from '../../../i18n';
import { typography, useWebTheme } from '../../../theme';
import { authQuietLinkLookOf, authSubmitLookOf } from '../../../../src/theme/auth-look';

const BACK_HIT_SLOP = 12;

export interface SignInSubmit {
	label: string;
	onPress: () => unknown;
	/** The step cannot be sent yet: the pill fades and ignores a press, as it does while the request runs. */
	disabled: boolean;
	isLoading: boolean;
	testID?: string;
}

interface ISignInStep {
	/** The step's title and its line; the page draws it above the fields. */
	heading?: ReactNode;
	onBack?: () => unknown;
	backTestID?: string;
	submit: SignInSubmit;
	/** Links under the submit. */
	footer?: ReactNode;
	children: ReactNode;
}

/** One step of sign-in on the page: Back as a quiet link, the heading, the fields, then a full-width pill. */
export function SignInStep({ heading, onBack, backTestID, submit, footer, children }: Readonly<ISignInStep>) {
	const theme = useWebTheme();
	const isReady = !submit.disabled && !submit.isLoading;
	const submitLook = authSubmitLookOf(isReady, theme);
	const quietLink = authQuietLinkLookOf(theme);

	return (
		<View style={styles.step}>
			{onBack && (
				<Pressable
					testID={backTestID}
					accessibilityRole="button"
					hitSlop={BACK_HIT_SLOP}
					onPress={() => onBack()}
					style={styles.back}
				>
					<Feather name="arrow-left" size={14} color={quietLink.color} />
					<Text style={[styles.backText, quietLink]}>{translate('common.back')}</Text>
				</Pressable>
			)}
			{heading && <View style={styles.heading}>{heading}</View>}
			<View style={styles.fields}>{children}</View>
			<Pressable
				testID={submit.testID}
				accessibilityRole="button"
				accessibilityState={{ disabled: !isReady, busy: submit.isLoading }}
				disabled={!isReady}
				onPress={() => submit.onPress()}
				style={[styles.submit, submitLook.button]}
			>
				{submit.isLoading && <ActivityIndicator size="small" color={submitLook.labelColor} />}
				<Text style={[styles.submitText, { color: submitLook.labelColor }]}>{submit.label}</Text>
			</Pressable>
			{footer}
		</View>
	);
}

const styles = StyleSheet.create({
	back: {
		alignItems: 'center',
		alignSelf: 'flex-start',
		flexDirection: 'row',
		gap: 6,
		minHeight: 24
	},
	backText: {
		fontFamily: typography.primary.medium
	},
	fields: {
		gap: 20,
		width: '100%'
	},
	heading: {
		marginBottom: 28,
		marginTop: 24
	},
	step: {
		width: '100%'
	},
	submit: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 24
	},
	submitText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 15
	}
});
