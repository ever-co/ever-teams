/** @jsxImportSource theme-ui */

import { Button, IButtonProps } from './button';

const ThemedButton = (props: IButtonProps) => {
	return (
		<Button sx={{ background: 'mainColor' }} {...props}>
			{props.children}
		</Button>
	);
};

ThemedButton.displayName = 'ThemedButton';

export { ThemedButton };
