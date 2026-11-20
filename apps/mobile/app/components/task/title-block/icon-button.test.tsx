import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import IconButton from './icon-button';

describe("a task title's icon button", () => {
	it('carries the name of its action for screen readers, and runs it', async () => {
		const copy = jest.fn();
		await render(
			<IconButton testID="task-title-copy" icon="copy" label="Copy title" color="#71717a" onPress={copy} />
		);

		await fireEvent.press(screen.getByLabelText('Copy title'));

		expect(copy).toHaveBeenCalledTimes(1);
	});
});
