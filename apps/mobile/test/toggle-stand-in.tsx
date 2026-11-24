/**
 * A stand-in of Toggle for tests: a plain button that carries the switch's state and name. Toggle's own file does not
 * type-check under ts-jest, so a test that draws a switch takes this one.
 */
import React from 'react';
import { Pressable } from 'react-native';

type ToggleStandInProps = { value: boolean; onPress?: () => void; accessibilityLabel?: string };

export function toggleStandIn() {
	return {
		Toggle: ({ value, onPress, accessibilityLabel }: ToggleStandInProps) => (
			<Pressable
				testID="settings-switch"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ checked: value }}
				onPress={onPress}
			/>
		)
	};
}
