import {
	Editor,
	BaseEditor,
	Transforms,
	Element as SlateElement,
	Path,
	Range,
} from 'slate';
import { ReactEditor } from 'slate-react';
import { jsx } from 'slate-hyperscript';

export class TextEditorService {
	static toggleMark(
		editor: BaseEditor,
		format: string,
		isMarkActive: (editor: BaseEditor, format: string) => boolean
	) {
		const isActive = isMarkActive(editor, format);

		if (isActive) {
			Editor.removeMark(editor, format);
		} else {
			Editor.addMark(editor, format, true);
		}
	}

	static toggleBlock(
		editor: BaseEditor,
		format: string,
		isBlockActive: (editor: any, format: any, blockType?: string) => boolean,
		LIST_TYPES: string[],
		TEXT_ALIGN_TYPES: string[]
	) {
		const isActive = isBlockActive(
			editor,
			format,
			TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
		);

		const isList = LIST_TYPES.includes(format);

		Transforms.unwrapNodes(editor, {
			match: (n) =>
				!Editor.isEditor(n) &&
				SlateElement.isElement(n) &&
				//@ts-ignore
				LIST_TYPES.includes(n.type) &&
				!TEXT_ALIGN_TYPES.includes(format),
			split: true,
		});

		let newProperties: Partial<SlateElement>;
		if (TEXT_ALIGN_TYPES.includes(format)) {
			newProperties = {
				//@ts-ignore
				align: isActive ? undefined : format,
			};
		} else {
			newProperties = {
				//@ts-ignore
				type: isActive ? 'paragraph' : isList ? 'li' : format,
			};
		}
		Transforms.setNodes<SlateElement>(editor, newProperties);

		if (!isActive && isList) {
			const block = { type: format, children: [] };
			Transforms.wrapNodes(editor, block);
		}
	}
}

export const isHtml = (value: string): boolean => {
	const htmlRegex = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/i;
	return htmlRegex.test(value);
};

interface ElementAttributes {
	[key: string]: string | null;
}

const ELEMENT_TAGS: { [key: string]: (el: HTMLElement) => ElementAttributes } =
	{
		A: (el) => ({ type: 'link', url: el.getAttribute('href') }),
		BLOCKQUOTE: () => ({ type: 'quote' }),
		H1: () => ({ type: 'h1' }),
		H2: () => ({ type: 'h2' }),
		// H3: () => ({ type: 'heading-three' }),
		// H4: () => ({ type: 'heading-four' }),
		// H5: () => ({ type: 'heading-five' }),
		// H6: () => ({ type: 'heading-six' }),
		// IMG: (el) => ({ type: 'image', url: el.getAttribute('src') }),
		LI: () => ({ type: 'li' }),
		OL: () => ({ type: 'ol' }),
		P: () => ({ type: 'paragraph' }),
		PRE: () => ({ type: 'code' }),
		UL: () => ({ type: 'ul' }),
	};

const TEXT_TAGS: { [key: string]: () => { [key: string]: boolean } } = {
	CODE: () => ({ code: true }),
	DEL: () => ({ strikethrough: true }),
	EM: () => ({ italic: true }),
	I: () => ({ italic: true }),
	S: () => ({ strikethrough: true }),
	STRONG: () => ({ bold: true }),
	U: () => ({ underline: true }),
};

export const deserialize = (el: any): any => {
	if (el.nodeType === 3) {
		return el.textContent;
	} else if (el.nodeType !== 1) {
		return null;
	} else if (el.nodeName === 'BR') {
		return '\n';
	}

	const { nodeName } = el;
	let parent = el;

	if (
		nodeName === 'PRE' &&
		el.childNodes[0] &&
		el.childNodes[0].nodeName === 'CODE'
	) {
		parent = el.childNodes[0];
	}
	let children = Array.from(parent.childNodes).map(deserialize).flat();

	if (children.length === 0) {
		children = [{ text: '' }];
	}

	if (el.nodeName === 'BODY') {
		return jsx('fragment', {}, children);
	}

	if (ELEMENT_TAGS[nodeName]) {
		//@ts-ignore
		const attrs = ELEMENT_TAGS[nodeName](el);
		return jsx('element', attrs, children);
	}

	if (TEXT_TAGS[nodeName]) {
		//@ts-ignore
		const attrs = TEXT_TAGS[nodeName](el);
		return children.map((child) => jsx('text', attrs, child));
	}
	// if (nodeName === 'A') {
	// 	const href = el.getAttribute('href');
	// 	const text = el.textContent;
	// 	return jsx('element', { type: 'link', href }, children);
	// }

	return children;
};

export const withHtml = (editor: ReactEditor): ReactEditor => {
	const { insertData, isInline, isVoid } = editor;

	editor.isInline = (element: any) => {
		return element.type === 'link' ? true : isInline(element);
	};

	editor.isVoid = (element: any) => {
		return element.type === 'image' ? true : isVoid(element);
	};

	editor.insertData = (data) => {
		const html = data.getData('text/html');

		if (html) {
			const parsed = new DOMParser().parseFromString(html, 'text/html');
			const fragment = deserialize(parsed.body);
			Transforms.insertFragment(editor, fragment);
			return;
		}

		insertData(data);
	};

	return editor;
};

const createParagraphNode = (children = [{ text: '' }]) => ({
	type: 'paragraph',
	children,
});

export const createLinkNode = (href: string, text: string) => ({
	type: 'link',
	href,
	children: [{ text }],
});

export const insertLink = (editor: any, url: string | null) => {
	if (!url) return;

	const { selection } = editor;
	const link = createLinkNode(url, 'New Link');

	ReactEditor.focus(editor);
	//@ts-nocheck //add !!selection if not working
	if (selection) {
		const [parentNode, parentPath] = Editor.parent(
			editor,
			selection.focus?.path
		);

		// Remove the Link node if we're inserting a new link node inside of another
		// link.
		//@ts-ignore
		if (parentNode.type === 'link') {
			removeLink(editor);
		}

		if (editor.isVoid(parentNode)) {
			// Insert the new link after the void node
			//@ts-ignore
			Transforms.insertNodes(editor, createParagraphNode([link]), {
				at: Path.next(parentPath),
				select: true,
			});
		} else if (Range.isCollapsed(selection)) {
			// Insert the new link in our last known locatio
			Transforms.insertNodes(editor, link, { select: true });
		} else {
			// Wrap the currently selected range of text into a Link
			Transforms.wrapNodes(editor, link, { split: true });
			Transforms.collapse(editor, { edge: 'end' });
		}
	} else {
		// Insert the new link node at the bottom of the Editor when selection
		// is falsey
		//@ts-ignore
		Transforms.insertNodes(editor, createParagraphNode([link]));
	}
};

export const removeLink = (editor: BaseEditor, opts = {}) => {
	Transforms.unwrapNodes(editor, {
		...opts,
		match: (n) =>
			!Editor.isEditor(n) &&
			SlateElement.isElement(n as SlateElement) &&
			//@ts-ignore
			n.type === 'link',
	});
};
