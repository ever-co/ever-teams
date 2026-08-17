/**
 * Render smoke tests for the leaf UI components every screen is built from.
 *
 * These mount real component trees through the actual React Native 0.86 renderer under jest-expo,
 * so they catch what `tsc` cannot: a component that throws at render time, a prop that no longer
 * flows through, an i18n key path that resolves to nothing, a preset that produces an invalid style.
 * After a 4-major React Native jump onto the New Architecture, "it renders" is a meaningful bar.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from './button';
import { Text } from './text';
import { Card } from './card';
import { EmptyState } from './empty-state';
import { Icon, iconRegistry } from './icon';

describe('<Text>', () => {
	it('renders literal text', async () => {
		await render(<Text text="hello" />);
		expect(screen.getByText('hello')).toBeTruthy();
	});

	it('renders children when no text prop is given', async () => {
		await render(<Text>child content</Text>);
		expect(screen.getByText('child content')).toBeTruthy();
	});

	it.each(['xxl', 'xl', 'lg', 'md', 'sm', 'xs', 'xxs'] as const)('accepts size preset %s', async (size) => {
		await expect(render(<Text text="t" size={size} />)).resolves.toBeTruthy();
	});

	it.each(['default', 'bold', 'heading', 'subheading', 'formLabel', 'formHelper'] as const)('accepts preset %s', async (preset) => {
			await expect(render(<Text text="t" preset={preset} />)).resolves.toBeTruthy();
		}
	);
});

describe('<Button>', () => {
	it('renders its label and fires onPress', async () => {
		const onPress = jest.fn();
		await render(<Button text="Tap me" onPress={onPress} />);
		fireEvent.press(screen.getByText('Tap me'));
		expect(onPress).toHaveBeenCalledTimes(1);
	});

	it('does not fire onPress when disabled', async () => {
		const onPress = jest.fn();
		await render(<Button text="Nope" onPress={onPress} disabled />);
		fireEvent.press(screen.getByText('Nope'));
		expect(onPress).not.toHaveBeenCalled();
	});

	it.each(['default', 'filled', 'reversed'] as const)('renders preset %s', async (preset) => {
		await expect(render(<Button text="p" preset={preset} />)).resolves.toBeTruthy();
	});

	it('renders left and right accessories', async () => {
		await render(
			<Button
				text="acc"
				LeftAccessory={() => <Text text="L" />}
				RightAccessory={() => <Text text="R" />}
			/>
		);
		expect(screen.getByText('L')).toBeTruthy();
		expect(screen.getByText('R')).toBeTruthy();
	});
});

describe('<Card>', () => {
	it('renders heading, content and footer text', async () => {
		await render(<Card heading="H" content="C" footer="F" />);
		expect(screen.getByText('H')).toBeTruthy();
		expect(screen.getByText('C')).toBeTruthy();
		expect(screen.getByText('F')).toBeTruthy();
	});

	it('is pressable when onPress is supplied', async () => {
		const onPress = jest.fn();
		await render(<Card heading="press" onPress={onPress} />);
		fireEvent.press(screen.getByText('press'));
		expect(onPress).toHaveBeenCalled();
	});

	it.each(['top', 'center', 'space-between', 'force-footer-bottom'] as const)('accepts verticalAlignment %s', async (v) => {
			await expect(render(<Card heading="h" content="c" footer="f" verticalAlignment={v} />)).resolves.toBeTruthy();
		}
	);
});

describe('<EmptyState>', () => {
	it('renders the generic preset without props', async () => {
		await expect(render(<EmptyState />)).resolves.toBeTruthy();
	});

	it('renders custom heading and content and fires the button', async () => {
		const onPress = jest.fn();
		await render(<EmptyState heading="Nothing here" content="Try again" button="Retry" buttonOnPress={onPress} />);
		expect(screen.getByText('Nothing here')).toBeTruthy();
		expect(screen.getByText('Try again')).toBeTruthy();
		fireEvent.press(screen.getByText('Retry'));
		expect(onPress).toHaveBeenCalled();
	});
});

describe('<Icon>', () => {
	it('has a non-empty icon registry', async () => {
		expect(Object.keys(iconRegistry).length).toBeGreaterThan(0);
	});

	it('renders every registered icon without throwing', async () => {
		for (const name of Object.keys(iconRegistry) as (keyof typeof iconRegistry)[]) {
			await expect(render(<Icon icon={name} />)).resolves.toBeTruthy();
		}
	});

	it('is pressable when onPress is supplied', async () => {
		const onPress = jest.fn();
		const first = Object.keys(iconRegistry)[0] as keyof typeof iconRegistry;
		await render(<Icon icon={first} onPress={onPress} testID="icon" />);
		fireEvent.press(screen.getByTestId('icon'));
		expect(onPress).toHaveBeenCalled();
	});
});
