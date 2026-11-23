import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import DescriptionBlock from './index';

// The block draws through stand-ins for what surrounds the editor, and through the real editor of react-native-cn-quill,
// so that the test reads the WebView properties the task screen really passes on.
const mockWebViewProps: Array<Record<string, unknown>> = [];

jest.mock('react-native-webview', () => {
	const { createElement } = jest.requireActual('react');
	const { View } = jest.requireActual('react-native');
	return {
		WebView: (props: Record<string, unknown>) => {
			mockWebViewProps.push(props);
			return createElement(View);
		}
	};
});
// The toolbar talks to the editor's WebView once mounted, which the stand-in WebView above does not answer
jest.mock('react-native-cn-quill', () => {
	const actual = jest.requireActual('react-native-cn-quill');
	return { __esModule: true, default: actual.default, QuillToolbar: () => null };
});
jest.mock('../../accordion', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => children
}));
// Stable objects, as the stores give: the block draws its editor again whenever the theme's colors change
jest.mock('../../../models', () => {
	const stores = { TaskStore: { detailedTask: { id: 'task-har-3', description: '<p>Bring the green paint</p>' } } };
	return { useStores: () => stores };
});
jest.mock('../../../theme', () => {
	const theme = {
		colors: { background: '#ffffff', primary: '#282048', secondary: '#7e7991', border: 'hsl(240, 4%, 16%)' },
		dark: false
	};
	return { useAppTheme: () => theme };
});
jest.mock('../../../services/hooks/features/use-team-tasks', () => {
	const teamTasks = { updateDescription: jest.fn() };
	return { useTeamTasks: () => teamTasks };
});
jest.mock('../../svgs/icons', () => ({ copyIcon: '' }));
jest.mock('react-native-svg', () => ({ SvgXml: () => null }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('react-native-click-outside', () => {
	const outside = { current: null };
	return { useClickOutside: () => outside };
});

describe("the task screen's description", () => {
	beforeEach(() => {
		mockWebViewProps.length = 0;
	});

	it("gives the editor's WebView its data detector types as a list, the only form Android reads without closing", async () => {
		await render(<DescriptionBlock />);

		expect(mockWebViewProps.at(-1)?.dataDetectorTypes).toEqual(['none']);
	});

	it('keeps link previews on in the description', async () => {
		await render(<DescriptionBlock />);

		expect(mockWebViewProps.at(-1)?.allowsLinkPreview).toBe(true);
	});

	it("draws the line above the toolbar in the theme's border color, never a fixed light grey", async () => {
		await render(<DescriptionBlock />);

		const separator = StyleSheet.flatten(screen.getByTestId('description-separator').props.style);
		expect(separator.borderTopColor).toBe('hsl(240, 4%, 16%)');
		expect(separator.borderTopWidth).toBe(StyleSheet.hairlineWidth);
	});
});
