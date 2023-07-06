import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
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
import { clsxm } from '@app/utils';

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
				theme: {
					root: 'rounded focus:outline-none',
					link: 'cursor-pointer',
					heading: {
						h1: 'text-xl font-[500]',
						h2: 'text-lg font-[400]',
					},
					list: {
						nested: {
							listitem: 'leading-5',
						},
						ul: 'leading-5',
					},
					paragraph: 'leading-5',
					text: {
						bold: 'font-semibold',
						underline: 'underline',
						italic: 'italic',
						strikethrough: 'line-through',
						underlineStrikethrough: 'underlined-line-through',
					},
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

	return (
		<div>
			<div className="border-b-2  w-full">
				<div className="py-5"></div>
				{editorConfig ? (
					<LexicalComposer initialConfig={editorConfig}>
						<DescriptionToolbar />
						<ListPlugin />
						<div
							className={clsxm(
								'editor-container',
								'relative',
								'prose dark:prose-invert  leading-normal'
							)}
						>
							<RichTextPlugin
								contentEditable={
									<ContentEditable
										className={clsxm(
											'editor-input outline-none',
											'relative resize-none',
											'min-h-[150px] z-10 mt-4'
										)}
									/>
								}
								placeholder={
									<p className="text-[#A5A2B2] text-sm ">
										Write a complete description of your project...
									</p>
								}
								ErrorBoundary={LexicalErrorBoundary}
							/>
						</div>
						<OnChangePlugin onChange={() => setIsUpdated(true)} />
						<MarkdownShortcutPlugin transformers={TRANSFORMERS} />
						<HistoryPlugin />

						<DescriptionFooter
							isUpdated={isUpdated}
							setIsUpdated={() => {
								setIsUpdated(false);
							}}
						/>
					</LexicalComposer>
				) : null}
			</div>
		</div>
	);
};
export default TaskDescriptionBlock;
