import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import DescriptionToolbar from './decription-toolbar';
import { TRANSFORMERS } from '@lexical/markdown';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import DescriptionFooter from './decription-footer';
import { detailedTaskState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { useState } from 'react';
import DescriptionLoader from './description-loader';

const TaskDescriptionBlock = () => {
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const [task] = useRecoilState(detailedTaskState);

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
		editorState: task?.description ? task.description : undefined,
	};

	return (
		<div>
			<div className="border-b-2  w-full">
				<div className="py-5"></div>
				{task?.description ? (
					<LexicalComposer initialConfig={editorConfig}>
						<DescriptionToolbar />
						<RichTextPlugin
							contentEditable={
								<ContentEditable className="editor-input outline-none py-2" />
							}
							placeholder={null}
							ErrorBoundary={LexicalErrorBoundary}
						/>
						<OnChangePlugin onChange={() => !isUpdated && setIsUpdated(true)} />
						<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
						<HistoryPlugin />

						<DescriptionFooter
							isUpdated={isUpdated}
							setIsUpdated={() => {
								setIsUpdated(false);
							}}
						/>
					</LexicalComposer>
				) : (
					<DescriptionLoader />
				)}
			</div>
		</div>
	);
};
export default TaskDescriptionBlock;
