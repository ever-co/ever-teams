import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';
import { PropertyTrigger, PropertyTriggerButton, propertyTriggerLookOf } from './property-trigger';
import { themeFor } from '../../src/theme/use-theme';

jest.mock('../theme', () => ({
	...jest.requireActual('../theme/typography'),
	useWebTheme: () => jest.requireActual('../../src/theme/use-theme').themeFor('light')
}));
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const light = themeFor('light');
const medium = { name: 'medium', bgColor: '#2563eb' };
const springRelease = { name: 'spring release' };

function triggerStyleOf(kind: string) {
	return StyleSheet.flatten(screen.getByTestId(`property-trigger-${kind}`).props.style);
}

describe("a task property's trigger on the task page", () => {
	it("draws an empty property as the web's pill, the field's name muted after its placeholder glyph", async () => {
		await render(<PropertyTrigger kind="size" placeholder="Size" />);

		expect(triggerStyleOf('size')).toMatchObject({
			backgroundColor: light.colors.card,
			borderRadius: 14,
			minHeight: 28
		});
		expect(screen.getByTestId('property-placeholder-size')).toBeTruthy();
		expect(screen.getByText('Size')).toHaveStyle({ color: light.colors['muted-foreground'], fontSize: 13 });
	});

	it("draws a value with a color as the web's chip, rounded 6, its name capitalized in the chip's ink", async () => {
		await render(<PropertyTrigger kind="size" item={medium} placeholder="Size" />);
		const look = propertyTriggerLookOf(medium, light);

		expect(triggerStyleOf('size')).toMatchObject({ borderRadius: 6, minHeight: 28 });
		expect(look.ink).not.toBe(light.colors.foreground);
		expect(screen.getByText('medium')).toHaveStyle({ color: look.ink, fontSize: 12, textTransform: 'capitalize' });
	});

	it('draws a value without a color in the pill, its name in the foreground', async () => {
		await render(<PropertyTrigger kind="version" item={springRelease} placeholder="Version" />);

		expect(triggerStyleOf('version').borderRadius).toBe(14);
		expect(screen.getByText('spring release')).toHaveStyle({ color: light.colors.foreground, fontSize: 12 });
	});

	it("ends on the web's chevron at 60%", async () => {
		await render(<PropertyTrigger kind="priority" placeholder="Priority" />);

		expect(screen.getByTestId('property-trigger-chevron')).toHaveStyle({ opacity: 0.6 });
		expect(screen.getByTestId('icon-ChevronDown')).toBeTruthy();
	});

	it('opens its menu under the anchor it wraps', async () => {
		const open = jest.fn();
		const anchorRef = React.createRef<View>();
		await render(<PropertyTriggerButton kind="status" placeholder="Status" anchorRef={anchorRef} onPress={open} />);

		await fireEvent.press(screen.getByRole('button'));

		expect(open).toHaveBeenCalledTimes(1);
		expect(anchorRef.current).not.toBeNull();
	});
});
