import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, createEditor, Descendant } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, withReact, Slate } from 'slate-react';
import { htmlToSlate, slateToHtml } from 'slate-serializers';
import { Bold, Italic, Underline, Code } from 'lucide-react';
import { cn } from '@/core/lib/helpers';
import { isHtml } from '@/core/lib/helpers/text-editor-service';
import { configHtmlToSlate, configSlateToHtml } from '@/core/lib/helpers/text-editor-serializer-configurations';

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

const createEmptyParagraph = (): Descendant[] =>
	[{ type: 'paragraph', children: [{ text: '' }] }] as unknown as Descendant[];

// Element types whose children are block-level siblings (need newline between items).
// Excludes 'li': list items may have inline text children, joining with '\n' would corrupt output.
const BLOCK_CONTAINER_TYPES = new Set(['ul', 'ol', 'blockquote']);

const slateValueToText = (nodes: Descendant[], isBlockLevel = true): string => {
	const separator = isBlockLevel ? '\n' : '';
	return nodes
		.map((n) => {
			if (n && typeof n === 'object' && 'text' in n) return (n as { text: string }).text;
			if (n && typeof n === 'object' && 'children' in n) {
				const element = n as { type?: string; children: Descendant[] };
				const childIsBlockLevel = !!element.type && BLOCK_CONTAINER_TYPES.has(element.type);
				return slateValueToText(element.children, childIsBlockLevel);
			}
			return '';
		})
		.join(separator);
};

const getInitialEditorValue = (defaultValue: string | undefined): Descendant[] => {
	if (!defaultValue?.trim()) return createEmptyParagraph();
	if (isHtml(defaultValue)) {
		const slateNodes = htmlToSlate(defaultValue, configHtmlToSlate) as unknown as Descendant[];
		return Array.isArray(slateNodes) && slateNodes.length > 0 ? slateNodes : createEmptyParagraph();
	}
	return [{ type: 'paragraph', children: [{ text: defaultValue }] }] as unknown as Descendant[];
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


	const toggleMark = (format: string) => {
		// @ts-ignore
		const isActive = Editor.marks(editor)?.[format];
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
						const plainText = slateValueToText(value);
						const words = countWords(plainText);
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
							// Always call onChange with HTML to preserve bold/italic/underline - parent decides whether to block submission based on validity
							onChange?.(html);
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
