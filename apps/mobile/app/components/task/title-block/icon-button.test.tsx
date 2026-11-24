import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import IconButton from './icon-button';
import { Copy } from '../../../../src/components/icons';

jest.mock('../../../../src/components/icons', () =>
	jest.requireActual('../../../../test/icons-stand-in').iconsStandIn()
);

describe("a task title's icon button", () => {
	it('carries the name of its action for screen readers, and runs it', async () => {
		const copy = jest.fn();
		await render(
			<IconButton testID="task-title-copy" icon={Copy} label="Copy title" color="#71717a" onPress={copy} />
		);

		await fireEvent.press(screen.getByLabelText('Copy title'));

		expect(copy).toHaveBeenCalledTimes(1);
	});

	it('draws its icon at 18 in the color it was given', async () => {
		await render(
			<IconButton testID="task-title-copy" icon={Copy} label="Copy title" color="#71717a" onPress={jest.fn()} />
		);

		expect(screen.getByTestId('icon-Copy')).toHaveStyle({ color: '#71717a', fontSize: 18 });
	});
});
