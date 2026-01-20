import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Descendant, Text, BaseEditor } from 'slate';
import { withHistory, HistoryEditor } from 'slate-history';
import { Editable, withReact, Slate, ReactEditor } from 'slate-react';
import { Bold, Italic, Underline, Code } from 'lucide-react';
import { cn } from '@/core/lib/helpers';

// Custom Slate types
type CustomText = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	code?: boolean;
};

type ParagraphElement = {
	type: 'paragraph';
	children: CustomText[];
};

type CustomElement = ParagraphElement;

declare module 'slate' {
	interface CustomTypes {
		Editor: BaseEditor & ReactEditor & HistoryEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}

// Simple HTML escape function to prevent XSS
const escapeHtml = (text: string): string => {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};
	return text.replace(/[&<>"']/g, (char) => map[char]);
};

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
}

const countWords = (text: string) => {
	return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};

// Serialize Slate nodes to HTML
const serializeToHtml = (nodes: Descendant[]): string => {
	return nodes.map((node) => serializeNode(node)).join('');
};

const serializeNode = (node: Descendant): string => {
	if (Text.isText(node)) {
		let text = escapeHtml(node.text);
		if (node.bold) text = `<strong>${text}</strong>`;
		if (node.italic) text = `<em>${text}</em>`;
		if (node.underline) text = `<u>${text}</u>`;
		if (node.code) text = `<code>${text}</code>`;
		return text;
	}

	const children = node.children?.map((n: Descendant) => serializeNode(n)).join('') || '';
	switch (node.type) {
		case 'paragraph':
			return `<p>${children}</p>`;
		default:
			return children;
	}
};

// Deserialize HTML to Slate nodes
const deserializeFromHtml = (html: string): Descendant[] => {
	// If it's plain text (no HTML tags), return simple structure
	if (!html || !html.includes('<')) {
		return [{ type: 'paragraph', children: [{ text: html || '' }] }];
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const nodes = deserializeElement(doc.body);

	// Ensure we always return valid Slate structure
	if (nodes.length === 0) {
		return [{ type: 'paragraph', children: [{ text: '' }] }];
	}

	return nodes;
};

const deserializeElement = (el: Node): Descendant[] => {
	if (el.nodeType === Node.TEXT_NODE) {
		const text = el.textContent || '';
		return [{ text }];
	}

	if (el.nodeType !== Node.ELEMENT_NODE) {
		return [];
	}

	const element = el as Element;
	const children: Descendant[] = Array.from(element.childNodes).flatMap(deserializeElement);

	// Ensure children is never empty for elements that need children
	const safeChildren: CustomText[] = children.length > 0
		? children.filter((child): child is CustomText => Text.isText(child)).length > 0
			? children.filter((child): child is CustomText => Text.isText(child))
			: [{ text: '' }]
		: [{ text: '' }];

	switch (element.nodeName) {
		case 'BODY':
			// If body only contains text nodes, wrap in paragraph
			if (children.every((child) => Text.isText(child))) {
				return [{ type: 'paragraph', children: safeChildren }];
			}
			return children;
		case 'P':
			return [{ type: 'paragraph', children: safeChildren }];
		case 'STRONG':
		case 'B':
			return children.map((child) => (Text.isText(child) ? { ...child, bold: true } : child));
		case 'EM':
		case 'I':
			return children.map((child) => (Text.isText(child) ? { ...child, italic: true } : child));
		case 'U':
			return children.map((child) => (Text.isText(child) ? { ...child, underline: true } : child));
		case 'CODE':
			return children.map((child) => (Text.isText(child) ? { ...child, code: true } : child));
		case 'BR':
			return [{ text: '\n' }];
		default:
			return children;
	}
};

const RichTextEditor = ({ readonly = false, onChange, defaultValue }: IRichTextProps) => {
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);
	const [editorValue, setEditorValue] = useState<Descendant[]>(() => deserializeFromHtml(defaultValue || ''));
	const [wordCount, setWordCount] = useState(() => (defaultValue ? countWords(defaultValue.replace(/<[^>]*>/g, '')) : 0));
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const renderElement = useCallback((props: any) => <Element {...props} />, []);
	const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);


	const toggleMark = (format: keyof Omit<CustomText, 'text'>) => {
		const marks = Editor.marks(editor);
		const isActive = marks ? marks[format] : false;
		if (isActive) {
			Editor.removeMark(editor, format);
		} else {
			Editor.addMark(editor, format, true);
		}
	};

	return (
		<div className="border rounded-xl flex flex-col text-xs">
			{!readonly && (
				<div className="flex gap-3 p-1 border-b">
					<ToolbarButton onClick={() => toggleMark('bold')} icon={<Bold size={14} />} />
					<ToolbarButton onClick={() => toggleMark('italic')} icon={<Italic size={14} />} />
					<ToolbarButton onClick={() => toggleMark('underline')} icon={<Underline size={14} />} />
					<ToolbarButton onClick={() => toggleMark('code')} icon={<Code size={14} />} />
				</div>
			)}
			<Slate
				editor={editor}
				value={editorValue}
				onChange={(value) => {
					setEditorValue(value);

					// Determine if the change is a content change (AST change) or just selection
					const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

					if (isAstChange) {
						const text = Editor.string(editor, []);
						const words = countWords(text);
						const html = serializeToHtml(value);

						// Clear any existing timeout
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
						}

						// Defer state updates to avoid the React warning:
						// "Cannot update a component while rendering a different component"
						// This happens when Slate triggers normalization during a render cycle.
						timeoutRef.current = setTimeout(() => {
							setWordCount(words);
							if (words <= 5000) {
								onChange?.(html);
							}
							timeoutRef.current = null;
						}, 0);
					}
				}}
			>
				<Editable
					className="p-2 min-h-[5rem] max-h-[15rem] outline-none overflow-y-auto"
					placeholder="Insert description here..."
					renderElement={renderElement}
					renderLeaf={renderLeaf}
					spellCheck
					readOnly={readonly}
				/>
			</Slate>
			<div className={cn('text-right py-1 px-2 text-xs', wordCount > 5000 ? 'text-red-500' : 'text-gray-500')}>
				{wordCount}/5000 words
			</div>
		</div>
	);
};

const ToolbarButton = ({ onClick, icon }: { onClick: () => void; icon: React.ReactNode }) => (
	<button
		type="button"
		className=" hover:bg-primary/5 rounded-sm h-fit px-2 py-1  text-[.5rem] font-light"
		onMouseDown={(e) => {
			e.preventDefault();
			onClick();
		}}
	>
		{icon}
	</button>
);

const Element = ({ attributes, children }: any) => <p {...attributes}>{children}</p>;

const Leaf = ({ attributes, children, leaf }: any) => {
	if (leaf.bold) children = <strong>{children}</strong>;
	if (leaf.code) children = <code>{children}</code>;
	if (leaf.italic) children = <em>{children}</em>;
	if (leaf.underline) children = <u>{children}</u>;

	return <span {...attributes}>{children}</span>;
};

export default RichTextEditor;
