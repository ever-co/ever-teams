import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hsl, webColorTokens } from '../theme/tokens';
import type { Theme } from '../theme/use-theme';

const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;
const START_GLOW_ALPHA = 0.55;
const STOP_GLOW_ALPHA = 0.5;

export interface RunButtonProps {
	theme: Theme;
	running: boolean;
	/** 24 in the header's pill, 48 on a timer card. */
	size: 24 | 48;
	/** The main timer's button carries a soft shadow tinted with its own color, as on the web. */
	glow?: boolean;
	disabled?: boolean;
	onPress: () => void;
	testID?: string;
	accessibilityLabel: string;
}

function fillOf(theme: Theme, running: boolean) {
	if (running) {
		return theme.colors.destructive;
	}
	return theme.colors.primary;
}

function glowOf(theme: Theme, running: boolean) {
	const tokens = webColorTokens[theme.scheme];
	if (running) {
		return `0 6px 16px -6px ${hsl(tokens.destructive, STOP_GLOW_ALPHA)}`;
	}
	return `0 6px 16px -6px ${hsl(tokens.primary, START_GLOW_ALPHA)}`;
}

function shadowOf(theme: Theme, running: boolean, glow: boolean) {
	if (!glow) {
		return null;
	}
	return { boxShadow: glowOf(theme, running) };
}

function iconOf(running: boolean) {
	if (running) {
		return 'stop' as const;
	}
	return 'play' as const;
}

function opacityOf(pressed: boolean, disabled: boolean) {
	if (disabled) {
		return DISABLED_OPACITY;
	}
	if (pressed) {
		return PRESSED_OPACITY;
	}
	return 1;
}

/** The web's round timer button: start in primary, stop in destructive, a white mark in the middle. */
export function RunButton({
	theme,
	running,
	size,
	glow = false,
	disabled = false,
	onPress,
	testID,
	accessibilityLabel
}: Readonly<RunButtonProps>) {
	const shape = { width: size, height: size, borderRadius: size / 2, backgroundColor: fillOf(theme, running) };
	const shadow = shadowOf(theme, running, glow);
	return (
		<Pressable
			testID={testID}
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [styles.button, shape, shadow, { opacity: opacityOf(pressed, disabled) }]}
		>
			<Ionicons name={iconOf(running)} size={size / 2} color={theme.colors['primary-foreground']} />
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		justifyContent: 'center'
	}
});
