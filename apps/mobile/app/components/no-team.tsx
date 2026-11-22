import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Users } from '../../src/components/icons';
import { useWebTheme } from '../theme';
import type { Theme } from '../../src/theme/use-theme';
import { translate } from '../i18n';

// The web's illustration keeps its two brand purples in both themes: a soft disc and the people glyph on it
const ILLUSTRATION_DISC = 'rgba(103, 85, 201, 0.2)';
const ILLUSTRATION_GLYPH = '#3826A6';
const ILLUSTRATION_SIZE = 70;
const GLYPH_SIZE = 32;
const PRESSED_OPACITY = 0.85;

// On a dark page the brand ink barely shows on its disc: the glyph takes the primary's ink for dark surfaces there
function glyphColorOf(theme: Theme): string {
	if (theme.scheme === 'dark') {
		return theme.colors['primary-ink'];
	}
	return ILLUSTRATION_GLYPH;
}

function opacityWhen(pressed: boolean): number {
	if (pressed) {
		return PRESSED_OPACITY;
	}
	return 1;
}

interface Props {
	onPress: () => unknown;
}

/** The page of a person without a team, as the web draws it: the illustration, the heading, one line and Create. */
const NoTeam = ({ onPress }: Readonly<Props>) => {
	const theme = useWebTheme();
	return (
		<View style={styles.container}>
			<View style={styles.illustration}>
				<Users size={GLYPH_SIZE} color={glyphColorOf(theme)} />
			</View>
			<Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.foreground }]}>
				{translate('noTeamScreen.createYourTeam')}
			</Text>
			<Text style={[styles.hint, { color: theme.colors['muted-foreground'] }]}>
				{translate('noTeamScreen.hintMessage')}
			</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => onPress()}
				style={({ pressed }) => [
					styles.createButton,
					{
						backgroundColor: theme.colors.primary,
						borderRadius: theme.radius.full,
						minHeight: theme.minimumTouchTarget,
						opacity: opacityWhen(pressed)
					}
				]}
			>
				<Text style={[styles.createLabel, { color: theme.colors['primary-foreground'] }]}>
					{translate('teamScreen.createNewTeamButton')}
				</Text>
			</Pressable>
		</View>
	);
};

export default NoTeam;

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 24
	},
	createButton: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 24,
		paddingHorizontal: 20
	},
	createLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	heading: {
		fontSize: 20,
		fontWeight: '600',
		lineHeight: 28,
		marginBottom: 8,
		textAlign: 'center'
	},
	hint: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center'
	},
	illustration: {
		alignItems: 'center',
		backgroundColor: ILLUSTRATION_DISC,
		borderRadius: ILLUSTRATION_SIZE / 2,
		height: ILLUSTRATION_SIZE,
		justifyContent: 'center',
		marginBottom: 16,
		width: ILLUSTRATION_SIZE
	}
});
