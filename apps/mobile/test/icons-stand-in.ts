import { createElement } from 'react';
import { Text } from 'react-native';

type StandInProps = { color?: string; size?: number };

function standInOf(name: string) {
	const Icon = ({ color, size }: StandInProps) =>
		createElement(Text, { testID: `icon-${name}`, style: { color, fontSize: size } }, name);
	Icon.displayName = name;
	return Icon;
}

/**
 * The phone's icons (src/components/icons) as text in tests: each draws its name with the color and size it was
 * given, so a test reads which icon a screen shows. Use it as a jest.mock factory of the icons module.
 */
export function iconsStandIn() {
	return new Proxy({}, { get: (_target, name: string) => standInOf(name) });
}
