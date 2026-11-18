import React from 'react';
import { render } from '@testing-library/react-native';
import { reportCrash } from '../../utils/crash-reporting';
import { ErrorBoundary } from './error-boundary';

jest.mock('../../utils/crash-reporting', () => ({ reportCrash: jest.fn() }));
jest.mock('expo', () => ({ reloadAppAsync: jest.fn(async () => undefined) }));
// screen.tsx has type errors of its own on develop, which ts-jest would report here; the layout is not under test.
jest.mock('../../components/screen', () => ({
	Screen: ({ children }: { children: React.ReactNode }) => children
}));

function Broken(): React.ReactElement {
	throw new Error('render failed');
}

describe('ErrorBoundary', () => {
	it('reports the error it caught, since release builds no longer show it', async () => {
		const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);

		await render(
			<ErrorBoundary catchErrors="always">
				<Broken />
			</ErrorBoundary>
		);

		expect(reportCrash).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }));
		quiet.mockRestore();
	});
});
