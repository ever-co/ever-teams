import React from 'react';
import { render } from '@testing-library/react-native';
import QuillEditor from 'react-native-cn-quill';
import { editorWebViewProps } from './editor-web-view';

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

async function webViewOfTheEditor(): Promise<Record<string, unknown> | undefined> {
	await render(<QuillEditor webview={editorWebViewProps} initialHtml="<p>Repaint the hatch</p>" />);
	return mockWebViewProps.at(-1);
}

describe('the WebView of the task description editor', () => {
	beforeEach(() => {
		mockWebViewProps.length = 0;
	});

	it('gets its data detector types as a list, the only form Android reads without closing the app', async () => {
		const props = await webViewOfTheEditor();

		expect(props?.dataDetectorTypes).toEqual(['none']);
	});

	it('keeps link previews on', async () => {
		const props = await webViewOfTheEditor();

		expect(props?.allowsLinkPreview).toBe(true);
	});
});
