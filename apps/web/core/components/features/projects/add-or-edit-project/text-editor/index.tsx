import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Descendant, BaseEditor, Text } from 'slate';
import { withHistory, HistoryEditor } from 'slate-history';
import { Editable, withReact, Slate, ReactEditor } from 'slate-react';
import { htmlToSlate, slateToHtml } from 'slate-serializers';
import { Bold, Italic, Underline, Code } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import {
	configHtmlToSlate,
	configSlateToHtml
} from '@/core/lib/helpers/text-editor-serializer-configurations';
import { isHtml } from '@/core/lib/helpers/text-editor-service';

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

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
	/** Called when the word count validity changes (true = within limit, false = over 5000 words) */
	onValidityChange?: (valid: boolean) => void;
}

const countWords = (text: string) => {
	return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
};

/** Keep only marks supported by this editor (bold, italic, underline, code). */
const stripMarks = (n: { text: string; [k: string]: unknown }): CustomText => ({
	text: n.text ?? '',
	...(n.bold ? { bold: true } : {}),
	...(n.italic ? { italic: true } : {}),
	...(n.underline ? { underline: true } : {}),
	...(n.code ? { code: true } : {})
});

/** Flatten nested elements into a single list of text nodes with marks. */
const collectTextNodes = (nodes: unknown[]): CustomText[] => {
	const out: CustomText[] = [];
	for (const node of nodes) {
		if (node && typeof node === 'object' && 'text' in node) {
			out.push(stripMarks(node as { text: string; [k: string]: unknown }));
			continue;
		}
		if (node && typeof node === 'object' && 'children' in node && Array.isArray((node as { children: unknown[] }).children)) {
			out.push(...collectTextNodes((node as { children: unknown[] }).children));
		}
	}
	return out;
};

/** Normalize htmlToSlate output to our schema: type 'paragraph' and supported marks only. */
const normalizeToSimpleSchema = (nodes: unknown[]): Descendant[] => {
	const result: Descendant[] = [];
	for (const node of nodes) {
		if (!node || typeof node !== 'object') continue;
		if ('text' in node) {
			result.push({
				type: 'paragraph',
				children: [stripMarks(node as { text: string; [k: string]: unknown })]
			});
			continue;
		}
		const el = node as { type?: string; children?: unknown[] };
		if (el.type === 'p' && Array.isArray(el.children)) {
			const children = collectTextNodes(el.children);
			result.push({
				type: 'paragraph',
				children: children.length ? children : [{ text: '' }]
			});
			continue;
		}
		if (el.type && Array.isArray(el.children)) {
			result.push(...normalizeToSimpleSchema(el.children));
		}
	}
	return result.length ? result : [{ type: 'paragraph', children: [{ text: '' }] }];
};

/** Extract plain text from Slate value for word count. */
const slateValueToText = (nodes: Descendant[]): string => {
	return nodes
		.flatMap((n) => {
			if (Text.isText(n)) return n.text;
			if (n && typeof n === 'object' && 'children' in n) return slateValueToText((n as { children: Descendant[] }).children);
			return '';
		})
		.join('');
};

const getInitialEditorValue = (defaultValue: string | undefined): Descendant[] => {
	if (!defaultValue) return [{ type: 'paragraph', children: [{ text: '' }] }];
	if (isHtml(defaultValue)) {
		try {
			const slateNodes = htmlToSlate(defaultValue, configHtmlToSlate) as unknown[];
			return normalizeToSimpleSchema(Array.isArray(slateNodes) ? slateNodes : [slateNodes]);
		} catch {
			return [{ type: 'paragraph', children: [{ text: defaultValue }] }];
		}
	}
	return [{ type: 'paragraph', children: [{ text: String(defaultValue) }] }];
};

const RichTextEditor = ({ readonly = false, onChange, defaultValue, onValidityChange }: IRichTextProps) => {
	const editor = useMemo(() => withHistory(withReact(createEditor())), []);
	const initialValue = useMemo(() => getInitialEditorValue(defaultValue), [defaultValue]);
	const [editorValue, setEditorValue] = useState<Descendant[]>(initialValue);
	const [wordCount, setWordCount] = useState(() =>
		defaultValue ? countWords(isHtml(defaultValue) ? slateValueToText(initialValue) : defaultValue) : 0
	);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Notify parent of initial validity on mount
	useEffect(() => {
		onValidityChange?.(wordCount <= 5000);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

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
						const html = slateToHtml(value, configSlateToHtml);

						// Clear any existing timeout
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
						}

						// Defer state updates to avoid the React warning:
						// "Cannot update a component while rendering a different component"
						// This happens when Slate triggers normalization during a render cycle.
						timeoutRef.current = setTimeout(() => {
							setWordCount(words);
							const valid = words <= 5000;
							onValidityChange?.(valid);
							if (valid) {
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
