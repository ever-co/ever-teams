import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import DescriptionToolbar from './decription-toolbar';
import { TRANSFORMERS } from '@lexical/markdown';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { AutoLinkNode, LinkNode } from '@lexical/link';

interface IDescriptionBlockProps {
	initialValue?: string;
}

const TaskDescriptionBlock = (props: IDescriptionBlockProps) => {
	const editorConfig = {
		namespace: 'MyEditor',
		onError(error: any) {
			throw error;
		},
		nodes: [
			HeadingNode,
			ListNode,
			ListItemNode,
			QuoteNode,
			CodeNode,
			CodeHighlightNode,
			TableNode,
			TableCellNode,
			TableRowNode,
			AutoLinkNode,
			LinkNode,
		],
	};

	return (
		<div>
			<div className="border-b-2  w-full">
				<div className="py-5"></div>
				<LexicalComposer initialConfig={editorConfig}>
					<DescriptionToolbar />
					<RichTextPlugin
						contentEditable={
							<ContentEditable className="editor-input outline-none py-2" />
						}
						placeholder={null}
						ErrorBoundary={LexicalErrorBoundary}
					/>

					<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
					<HistoryPlugin />
				</LexicalComposer>
				<div>
					<label className="text-xs text-gray-300">Acceptance Criteria</label>
				</div>
			</div>
		</div>
	);
};
export default TaskDescriptionBlock;
