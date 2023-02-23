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
import { useEffect, useState } from 'react';

const TaskDescriptionBlock = () => {
	const [isUpdated, setIsUpdated] = useState<boolean>(false);
	const [task] = useRecoilState(detailedTaskState);
	const [editorConfig, setEditorConfig] = useState<any>();

	useEffect(() => {
		if (task) {
			setEditorConfig({
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
				editorState: task.description !== '' ? task.description : undefined,
			});
		}
	}, [task]);

	const onChange = () => {
		setIsUpdated(true);
	};

	if (editorConfig)
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
						<OnChangePlugin onChange={onChange} />
						<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
						<HistoryPlugin />

						<DescriptionFooter
							isUpdated={isUpdated}
							setIsUpdated={() => {
								setIsUpdated(false);
							}}
						/>
					</LexicalComposer>
				</div>
			</div>
		);
};
export default TaskDescriptionBlock;
