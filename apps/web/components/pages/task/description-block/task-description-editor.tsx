import Toolbar from './editor-toolbar';
import {
	TextEditorService,
	withHtml,
} from './editor-components/TextEditorService';
import isHotkey from 'is-hotkey';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Editor, createEditor, Element as SlateElement } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import EditorFooter from './editor-footer';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { htmlToSlate, htmlToSlateConfig } from 'slate-serializers';
import { isHtml } from './editor-components/TextEditorService';

const HOTKEYS: { [key: string]: string } = {
	'mod+b': 'bold',
	'mod+i': 'italic',
	'mod+u': 'underline',
	'mod+`': 'code',
};

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	handleTemplateChange?: (key: string, value: any) => void;
}

const RichTextEditor = ({ readonly }: IRichTextProps) => {
	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);
	const editor = useMemo(
		() => withHtml(withHistory(withReact(createEditor()))),
		[]
	);
	const [task] = useRecoilState(detailedTaskState);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const [key, setKey] = useState(0); // Add key state, we need it as it re-renders the editor
	const [editorValue, setEditorValue] = useState<any>();

	const initialValue = useMemo(() => {
		let value;
		if (task && task.description) {
			if (isHtml(task.description)) {
				value = htmlToSlate(task.description, htmlToSlateConfig);
				return value;
			}
			return JSON.parse(task?.description);
		} else {
			return [{ type: 'paragraph', children: [{ text: '' }] }];
		}
	}, [task]);

	useEffect(() => {
		if (key < 6) {
			setKey((prev) => prev + 1);
		}
	}, [initialValue, key]);

	return (
		<div className="flex flex-col prose dark:prose-invert">
			{task && (
				<Slate
					key={key}
					editor={editor}
					value={initialValue}
					onChange={(e) => {
						setEditorValue(e);
						setIsUpdated(true);
					}}
				>
					<Toolbar isMarkActive={isMarkActive} isBlockActive={isBlockActive} />

					<Editable
						renderPlaceholder={({ children, attributes }) => (
							<div {...attributes}>
								<p className="mt-0 p-0">{children}</p>
							</div>
						)}
						className={`${
							readonly
								? ''
								: 'textarea resize-y block w-full bg-transparent dark:text-white h-64 overflow-y-scroll scrollbar-hide'
						}`}
						renderElement={renderElement}
						renderLeaf={renderLeaf}
						placeholder="Write a complete description of your project..."
						spellCheck
						readOnly={readonly}
						onKeyDown={(event) => {
							for (const hotkey in HOTKEYS) {
								if (isHotkey(hotkey, event as any)) {
									event.preventDefault();
									const mark = HOTKEYS[hotkey];
									TextEditorService.toggleMark(editor, mark, isMarkActive);
								}
							}
						}}
					/>
					<EditorFooter
						isUpdated={isUpdated}
						setIsUpdated={() => setIsUpdated(false)}
						editorValue={editorValue}
					/>
				</Slate>
			)}
		</div>
	);
};

const isBlockActive = (editor: any, format: string, blockType = 'type') => {
	const { selection } = editor;
	if (!selection) return false;

	const [match] = Array.from(
		Editor.nodes(editor, {
			at: Editor.unhangRange(editor, selection),
			match: (n) =>
				!Editor.isEditor(n) &&
				SlateElement.isElement(n) &&
				(n as { [key: string]: any })[blockType] === format,
		})
	);

	return !!match;
};

const isMarkActive = (editor: any, format: string) => {
	const marks = Editor.marks(editor);
	return marks ? (marks as { [key: string]: any })[format] === true : false;
};

const Element = ({ attributes, children, element }: any) => {
	const style = { textAlign: element.align };
	switch (element.type) {
		case 'blockquote':
			return (
				<blockquote style={style} {...attributes}>
					{children}
				</blockquote>
			);
		case 'code':
			return (
				<pre>
					<code {...attributes}>{children}</code>
				</pre>
			);
		case 'ul':
			return (
				<ul style={style} {...attributes}>
					{children}
				</ul>
			);
		case 'h1':
			return (
				<h1 style={style} {...attributes}>
					{children}
				</h1>
			);
		case 'h2':
			return (
				<h2 style={style} {...attributes}>
					{children}
				</h2>
			);
		case 'li': // Render <li> as a block element
			return (
				<li style={style} {...attributes}>
					{children}
				</li>
			);
		case 'ol':
			return (
				<ol style={style} {...attributes}>
					{children}
				</ol>
			);
		default:
			return (
				<p style={style} {...attributes}>
					{children}
				</p>
			);
	}
};

const Leaf = ({ attributes, children, leaf }: any) => {
	if (leaf.bold) {
		children = <strong>{children}</strong>;
	}

	if (leaf.code) {
		children = <code>{children}</code>;
	}

	if (leaf.italic) {
		children = <em>{children}</em>;
	}

	if (leaf.underline) {
		children = <u>{children}</u>;
	}

	return <span {...attributes}>{children}</span>;
};

export default RichTextEditor;

// interface ElementAttributes {
// 	[key: string]: string | null;
// }

// const ELEMENT_TAGS: { [key: string]: (el: HTMLElement) => ElementAttributes } =
// 	{
// 		A: (el) => ({ type: 'link', url: el.getAttribute('href') }),
// 		BLOCKQUOTE: () => ({ type: 'quote' }),
// 		H1: () => ({ type: 'h1' }),
// 		H2: () => ({ type: 'h2' }),
// 		H3: () => ({ type: 'heading-three' }),
// 		H4: () => ({ type: 'heading-four' }),
// 		H5: () => ({ type: 'heading-five' }),
// 		H6: () => ({ type: 'heading-six' }),
// 		IMG: (el) => ({ type: 'image', url: el.getAttribute('src') }),
// 		LI: () => ({ type: 'li' }),
// 		OL: () => ({ type: 'ol' }),
// 		P: () => ({ type: 'paragraph' }),
// 		PRE: () => ({ type: 'code' }),
// 		UL: () => ({ type: 'bulleted-list' }),
// 	};

// // COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
// const TEXT_TAGS: { [key: string]: () => { [key: string]: boolean } } = {
// 	CODE: () => ({ code: true }),
// 	DEL: () => ({ strikethrough: true }),
// 	EM: () => ({ italic: true }),
// 	I: () => ({ italic: true }),
// 	S: () => ({ strikethrough: true }),
// 	STRONG: () => ({ bold: true }),
// 	U: () => ({ underline: true }),
// };

// export const deserialize = (el: Node): any => {
// 	if (el.nodeType === 3) {
// 		return el.textContent;
// 	} else if (el.nodeType !== 1) {
// 		return null;
// 	} else if (el.nodeName === 'BR') {
// 		return '\n';
// 	}

// 	const { nodeName } = el;
// 	let parent = el;

// 	if (
// 		nodeName === 'PRE' &&
// 		el.childNodes[0] &&
// 		el.childNodes[0].nodeName === 'CODE'
// 	) {
// 		parent = el.childNodes[0];
// 	}
// 	let children = Array.from(parent.childNodes).map(deserialize).flat();

// 	if (children.length === 0) {
// 		children = [{ text: '' }];
// 	}

// 	if (el.nodeName === 'BODY') {
// 		return jsx('fragment', {}, children);
// 	}

// 	if (ELEMENT_TAGS[nodeName]) {
// 		//@ts-ignore
// 		const attrs = ELEMENT_TAGS[nodeName](el);
// 		return jsx('element', attrs, children);
// 	}

// 	if (TEXT_TAGS[nodeName]) {
// 		//@ts-ignore
// 		const attrs = TEXT_TAGS[nodeName](el);
// 		return children.map((child) => jsx('text', attrs, child));
// 	}

// 	return children;
// };

// const withHtml = (editor: ReactEditor): ReactEditor => {
// 	const { insertData, isInline, isVoid } = editor;

// 	editor.isInline = (element: any) => {
// 		return element.type === 'link' ? true : isInline(element);
// 	};

// 	editor.isVoid = (element: any) => {
// 		return element.type === 'image' ? true : isVoid(element);
// 	};

// 	editor.insertData = (data) => {
// 		const html = data.getData('text/html');

// 		if (html) {
// 			const parsed = new DOMParser().parseFromString(html, 'text/html');
// 			const fragment = deserialize(parsed.body);
// 			Transforms.insertFragment(editor, fragment);
// 			return;
// 		}

// 		insertData(data);
// 	};

// 	return editor;
// };
