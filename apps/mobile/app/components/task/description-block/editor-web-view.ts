import type { ComponentProps } from 'react';
import type QuillEditor from 'react-native-cn-quill';

type EditorWebViewProps = NonNullable<ComponentProps<typeof QuillEditor>['webview']>;

/**
 * The editor gives its WebView `dataDetectorTypes: "none"`, a string. On Android, under the new architecture, the
 * WebView's native side reads that property as a list only, and the app closes as soon as a task opens. A list of
 * one value overrides it and means the same on iOS, where the WebView turns a string into a list itself.
 */
export const editorWebViewProps: EditorWebViewProps = {
	allowsLinkPreview: true,
	dataDetectorTypes: ['none']
};
