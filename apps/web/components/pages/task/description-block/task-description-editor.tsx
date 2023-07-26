import Toolbar from './editor-toolbar';
import {
	TextEditorService,
	withHtml,
	withChecklists,
	isValidSlateObject,
} from './editor-components/TextEditorService';
import isHotkey from 'is-hotkey';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Editor,
	createEditor,
	Element as SlateElement,
	Descendant,
} from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import EditorFooter from './editor-footer';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { htmlToSlate } from 'slate-serializers';
import { isHtml } from './editor-components/TextEditorService';
import LinkElement from './editor-components/LinkElement';
import { configHtmlToSlate } from './editor-components/serializerConfigurations';
import CheckListElement from './editor-components/CheckListElement';

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
		() => withChecklists(withHtml(withHistory(withReact(createEditor())))),
		[]
	);
	const [task] = useRecoilState(detailedTaskState);
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const [key, setKey] = useState(0); // Add key state, we need it as it re-renders the editor
	const [editorValue, setEditorValue] = useState<any>();

	const initialValue = useMemo((): Descendant[] => {
		let value;
		if (task && task.description) {
			if (isHtml(task.description)) {
				// when value is an HTML
				value = htmlToSlate(task.description, configHtmlToSlate);
			} else if (isValidSlateObject(task.description)) {
				//when value is Slate Object
				value = JSON.parse(task.description) as Descendant[];
			} else {
				// Default case when the task.description is plain text
				value = [
					{
						//@ts-ignore
						type: 'paragraph',
						children: [{ text: task.description as string }],
					},
				];
			}
		} else {
			value = [{ type: 'paragraph', children: [{ text: '' }] }];
		}
		return value;
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
						className={`${
							readonly
								? ''
								: 'textarea resize-y block w-full bg-transparent dark:text-white h-64 overflow-y-scroll scrollbar-hide'
						}`}
						id="editor-container"
						renderPlaceholder={({ children, attributes }) => (
							<div {...attributes}>
								<div className="mt-0 p-0">{children}</div>
							</div>
						)}
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
		case 'link':
			return (
				<LinkElement {...attributes} element={element}>
					{children}
				</LinkElement>
			);
		case 'checklist':
			return (
				<CheckListElement {...attributes} element={element}>
					{children}
				</CheckListElement>
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
