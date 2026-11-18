import { get, useThemeUI } from 'theme-ui';
import { Button, IButtonProps } from './button';

/**
 * A color of the theme-ui theme, as its raw value. Set inline it wins over the utility classes of the component it
 * colors, also under the kit root of <TeamsProvider scopedStyles>, where those classes are more specific than an sx
 * style.
 */
export function useThemeColor(name: string): string | undefined {
	const { theme } = useThemeUI();
	// Without custom properties (the kit's theme turns them off) theme.colors holds the raw values, and a rawColors
	// there can only come from an outer provider: theme-ui writes it only when custom properties are on.
	let colors = theme.rawColors ?? theme.colors;
	if (theme.config?.useCustomProperties === false) {
		colors = theme.colors;
	}
	// get() gives a nested color scale's __default value, as an sx color does.
	const color = get(colors ?? {}, name);
	if (typeof color === 'string') {
		return color;
	}
	return undefined;
}

const ThemedButton = ({ style, ...props }: IButtonProps) => {
	const mainColor = useThemeColor('mainColor');
	return (
		<Button style={{ background: mainColor, ...style }} {...props}>
			{props.children}
		</Button>
	);
};

ThemedButton.displayName = 'ThemedButton';

export { ThemedButton };
