import { useThemeUI } from 'theme-ui';
import { Button, IButtonProps } from './button';

/**
 * A color of the theme-ui theme, as its raw value. Set inline it wins over the utility classes of the component it
 * colors, also under the kit root of <TeamsProvider scopedStyles>, where those classes are more specific than an sx
 * style.
 */
export function useThemeColor(name: string): string | undefined {
	const { theme } = useThemeUI();
	const colors = (theme.rawColors ?? theme.colors) as Record<string, unknown> | undefined;
	const color = colors?.[name];
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
