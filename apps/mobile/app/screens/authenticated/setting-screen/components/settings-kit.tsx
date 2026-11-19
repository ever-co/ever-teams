import React, { Children, Fragment, isValidElement, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	type AccessibilityRole,
	type ViewStyle
} from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { typography, useWebTheme } from '../../../../theme';
import type { Theme } from '../../../../../src/theme/use-theme';
import { Toggle } from '../../../../components/toggle';
import { webSwitchLookOf } from '../../../../../src/theme/switch-look';
import {
	settingsDividerOf,
	settingsSectionTitleColorOf,
	settingsSurfaceOf,
	type SettingsTone
} from '../../../../../src/theme/settings-look';

const CHEVRON_SIZE = 16;
const DISABLED_OPACITY = 0.5;

/** Rows on one surface, a hairline between two of them. */
export function SettingsSurface({ children }: Readonly<PropsWithChildren>) {
	const theme = useWebTheme();
	const rows = Children.toArray(children).filter(isValidElement);
	return (
		<View testID="settings-surface" style={settingsSurfaceOf(theme)}>
			{rows.map((row, index) => (
				<Fragment key={row.key ?? index}>
					{index > 0 && <View testID="settings-divider" style={settingsDividerOf(theme)} />}
					{row}
				</Fragment>
			))}
		</View>
	);
}

type SettingsSectionProps = PropsWithChildren<{ title: string; tone?: SettingsTone }>;

/** A titled group of rows: the danger zone's title in destructive-ink. */
export function SettingsSection({ title, tone = 'default', children }: Readonly<SettingsSectionProps>) {
	const theme = useWebTheme();
	return (
		<View style={styles.section}>
			<Text
				accessibilityRole="header"
				style={[styles.sectionTitle, { color: settingsSectionTitleColorOf(tone, theme) }]}
			>
				{title}
			</Text>
			<SettingsSurface>{children}</SettingsSurface>
		</View>
	);
}

type SettingsRowProps = {
	label: string;
	description?: string;
	onPress?: () => unknown;
	disabled?: boolean;
	/** The chevron that says the row opens something. */
	chevron?: boolean;
	/** A control at the end of the row, before the chevron: a switch, a quiet button. */
	trailing?: ReactNode;
	testID?: string;
};

function rowRoleOf(onPress: SettingsRowProps['onPress']): AccessibilityRole | undefined {
	if (onPress) {
		return 'button';
	}
	return undefined;
}

function rowStyleOf(pressed: boolean, theme: Theme): ViewStyle[] {
	if (pressed) {
		return [styles.row, { backgroundColor: theme.foreground(5) }];
	}
	return [styles.row];
}

function chevronStyleOf(disabled: boolean): ViewStyle | undefined {
	if (disabled) {
		return styles.disabled;
	}
	return undefined;
}

/** The web's settings row: a 14/500 label, a 13 muted description, at least 56 tall; the whole row opens it. */
export function SettingsRow({
	label,
	description,
	onPress,
	disabled = false,
	chevron = false,
	trailing,
	testID
}: Readonly<SettingsRowProps>) {
	const theme = useWebTheme();
	const [pressed, setPressed] = useState(false);
	const isInert = disabled || !onPress;
	const hasAction = Boolean(onPress);
	// The row's button holds its label and value only: a screen reader reaches the trailing control on its own, and a
	// row without an action is no button at all
	return (
		<View testID={testID} style={rowStyleOf(pressed, theme)}>
			<Pressable
				testID="settings-row-action"
				accessible={hasAction}
				accessibilityRole={rowRoleOf(onPress)}
				accessibilityState={{ disabled }}
				disabled={isInert}
				onPress={onPress}
				onPressIn={() => setPressed(true)}
				onPressOut={() => setPressed(false)}
				style={styles.rowAction}
			>
				<View style={styles.text}>
					<Text style={[styles.label, { color: theme.colors.foreground }]}>{label}</Text>
					{description ? (
						<Text style={[styles.description, { color: theme.colors['muted-foreground'] }]}>
							{description}
						</Text>
					) : null}
				</View>
			</Pressable>
			{trailing}
			{chevron && (
				<Pressable
					testID="settings-row-chevron"
					accessible={false}
					disabled={isInert}
					onPress={onPress}
					onPressIn={() => setPressed(true)}
					onPressOut={() => setPressed(false)}
					style={[styles.chevron, chevronStyleOf(disabled)]}
				>
					<AntDesign name="right" size={CHEVRON_SIZE} color={theme.colors['muted-foreground']} />
				</Pressable>
			)}
		</View>
	);
}

type SettingsSwitchProps = { value?: boolean; onPress?: () => unknown; accessibilityLabel: string };

/** The web's switch at the end of a settings row, named after its setting: a screen reader reaches it on its own. */
export function SettingsSwitch({ value, onPress, accessibilityLabel }: Readonly<SettingsSwitchProps>) {
	const look = webSwitchLookOf(useWebTheme());
	return (
		<Toggle
			variant="switch"
			value={value}
			accessibilityLabel={accessibilityLabel}
			onPress={() => onPress?.()}
			inputOuterStyle={look.track}
			inputInnerStyle={look.onFill}
			inputDetailStyle={look.knob}
			knobColor={look.knobColor}
		/>
	);
}

type SettingsImageRowProps = {
	image: ReactNode;
	changeLabel: string;
	onChange: () => unknown;
	deleteLabel: string;
	deleteDisabled: boolean;
	onDelete: () => unknown;
};

/** An avatar or a logo with the web's outline Change pill and a quiet delete in destructive-ink. */
export function SettingsImageRow({
	image,
	changeLabel,
	onChange,
	deleteLabel,
	deleteDisabled,
	onDelete
}: Readonly<SettingsImageRowProps>) {
	const theme = useWebTheme();
	return (
		<View style={styles.imageRow}>
			{image}
			<TouchableOpacity
				testID="settings-image-change"
				accessibilityRole="button"
				style={[styles.changePill, { borderColor: theme.colors.border }]}
				onPress={() => onChange()}
			>
				<Text style={[styles.changeText, { color: theme.colors.foreground }]}>{changeLabel}</Text>
			</TouchableOpacity>
			<TouchableOpacity
				testID="settings-image-delete"
				accessibilityRole="button"
				accessibilityLabel={deleteLabel}
				accessibilityState={{ disabled: deleteDisabled }}
				disabled={deleteDisabled}
				style={[styles.deleteButton, chevronStyleOf(deleteDisabled)]}
				onPress={() => onDelete()}
			>
				<Ionicons name="trash-outline" size={20} color={theme.colors['destructive-ink']} />
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	// it shrinks and wraps before it pushes the delete off the row, with large text or a long label
	changePill: {
		alignItems: 'center',
		borderRadius: 999,
		borderWidth: 1,
		flexShrink: 1,
		justifyContent: 'center',
		minHeight: 36,
		paddingHorizontal: 16,
		paddingVertical: 6
	},
	changeText: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		textAlign: 'center'
	},
	deleteButton: {
		alignItems: 'center',
		borderRadius: 8,
		height: 40,
		justifyContent: 'center',
		marginLeft: 'auto',
		width: 40
	},
	chevron: {
		alignSelf: 'stretch',
		justifyContent: 'center'
	},
	description: {
		fontFamily: typography.primary.normal,
		fontSize: 13,
		lineHeight: 17
	},
	disabled: {
		opacity: DISABLED_OPACITY
	},
	imageRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 16
	},
	label: {
		fontFamily: typography.primary.medium,
		fontSize: 14,
		lineHeight: 18
	},
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		minHeight: 56,
		paddingHorizontal: 16
	},
	rowAction: {
		alignSelf: 'stretch',
		flex: 1,
		justifyContent: 'center',
		paddingVertical: 12
	},
	section: {
		gap: 12
	},
	sectionTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 17,
		lineHeight: 22
	},
	text: {
		flex: 1,
		gap: 2
	}
});
