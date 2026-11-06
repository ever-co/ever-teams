import { Extension, type ChainedCommands, type Editor, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import {
	CodeBlock,
	Heading1,
	Heading2,
	Heading3,
	ImagePlus,
	ListBullet,
	ListNumbered,
	ListTodo,
	Minus,
	Paragraph,
	Quote,
	WritingHelp
} from '@/core/components/icons';
import type { SuggestionEntry } from './suggestion-list';
import { suggestionRender, type SuggestionLabels } from './suggestion-render';

type SlashItem = SuggestionEntry & {
	keywords: string[];
	run: (editor: Editor, range: Range) => void;
};

export type SlashHandlers = {
	pickImage: () => void;
	openAi: () => void;
};

export type SlashItemId =
	| 'text'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'bullet'
	| 'numbered'
	| 'todo'
	| 'quote'
	| 'code'
	| 'divider'
	| 'image'
	| 'ai';

export type SlashItemCopy = Record<SlashItemId, { title: string; hint: string }>;

export type SlashMenuOptions = {
	copy: SlashItemCopy;
	handlers: SlashHandlers;
	imagesEnabled: boolean;
	aiEnabled: boolean;
};

type BlockItem = Omit<SlashItem, 'run' | 'title' | 'hint'> & {
	id: SlashItemId;
	command: (chain: ChainedCommands) => ChainedCommands;
};

/**
 * On an empty line a block command turns that line into the block. On a line that already has words it opens the
 * block below them, as Notion does: "Steps: /code" must not swallow "Steps:" into the code block.
 */
function blockItem(item: BlockItem, copy: SlashItemCopy): SlashItem {
	const { command, ...rest } = item;
	return {
		...rest,
		...copy[item.id],
		run: (editor, range) => {
			const $from = editor.state.doc.resolve(range.from);
			const typed = editor.state.doc.textBetween(range.from, range.to);
			const otherText = $from.parent.textContent.replace(typed, '').trim();
			const chain = editor.chain().focus().deleteRange(range);
			const hasOtherWords = otherText.length > 0;
			const opensBelow = $from.parent.isTextblock && hasOtherWords;
			if (opensBelow) {
				const typedLength = range.to - range.from;
				const after = $from.after() - typedLength;
				chain.insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1);
			}
			command(chain).run();
		}
	};
}

function actionItem(
	id: SlashItemId,
	icon: SlashItem['icon'],
	keywords: string[],
	action: () => void,
	copy: SlashItemCopy
): SlashItem {
	return {
		id,
		icon,
		keywords,
		...copy[id],
		run: (editor, range) => {
			editor.chain().focus().deleteRange(range).run();
			action();
		}
	};
}

export function slashItems({ copy, handlers, imagesEnabled, aiEnabled }: SlashMenuOptions): SlashItem[] {
	const items: SlashItem[] = [
		blockItem(
			{ id: 'text', icon: Paragraph, keywords: ['paragraph', 'plain'], command: (c) => c.setParagraph() },
			copy
		),
		blockItem(
			{ id: 'h1', icon: Heading1, keywords: ['h1', 'title'], command: (c) => c.toggleHeading({ level: 1 }) },
			copy
		),
		blockItem(
			{ id: 'h2', icon: Heading2, keywords: ['h2', 'section'], command: (c) => c.toggleHeading({ level: 2 }) },
			copy
		),
		blockItem(
			{ id: 'h3', icon: Heading3, keywords: ['h3', 'subtitle'], command: (c) => c.toggleHeading({ level: 3 }) },
			copy
		),
		blockItem(
			{
				id: 'bullet',
				icon: ListBullet,
				keywords: ['ul', 'bullets', 'list'],
				command: (c) => c.toggleBulletList()
			},
			copy
		),
		blockItem(
			{
				id: 'numbered',
				icon: ListNumbered,
				keywords: ['ol', 'ordered', 'steps', 'list'],
				command: (c) => c.toggleOrderedList()
			},
			copy
		),
		blockItem(
			{
				id: 'todo',
				icon: ListTodo,
				keywords: ['task', 'checkbox', 'todo', 'checklist', 'criteria'],
				command: (c) => c.toggleTaskList()
			},
			copy
		),
		blockItem(
			{ id: 'quote', icon: Quote, keywords: ['blockquote', 'citation'], command: (c) => c.toggleBlockquote() },
			copy
		),
		blockItem(
			{
				id: 'code',
				icon: CodeBlock,
				keywords: ['pre', 'snippet', 'log', 'code'],
				command: (c) => c.toggleCodeBlock()
			},
			copy
		),
		blockItem(
			{
				id: 'divider',
				icon: Minus,
				keywords: ['hr', 'rule', 'separator', 'line'],
				command: (c) => c.setHorizontalRule()
			},
			copy
		)
	];

	if (imagesEnabled) {
		items.push(
			actionItem(
				'image',
				ImagePlus,
				['picture', 'screenshot', 'photo', 'upload', 'img'],
				handlers.pickImage,
				copy
			)
		);
	}

	if (aiEnabled) {
		items.push(actionItem('ai', WritingHelp, ['ai', 'write', 'improve', 'help'], handlers.openAi, copy));
	}

	return items;
}

function matchesQuery(item: SlashItem, query: string) {
	const titleMatches = item.title.toLowerCase().includes(query);
	if (titleMatches) {
		return true;
	}
	return item.keywords.some((keyword) => keyword.startsWith(query));
}

function filterSlashItems(items: SlashItem[], query: string): SlashItem[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) {
		return items;
	}
	return items.filter((item) => matchesQuery(item, normalized));
}

type SlashCommandOptions = {
	items: () => SlashItem[];
	labels: () => SuggestionLabels;
	onOpenChange?: (open: boolean) => void;
};

function isOutsideCodeBlock({ editor }: { editor: Editor }) {
	return !editor.isActive('codeBlock');
}

/** The "/" menu: insert a block without leaving the keyboard. */
export const SlashCommand = Extension.create<SlashCommandOptions>({
	name: 'slashCommand',

	addOptions() {
		return {
			items: () => [],
			labels: () => ({ emptyLabel: '', loadingLabel: '', ariaLabel: '' })
		};
	},

	addProseMirrorPlugins() {
		const suggestion: Omit<SuggestionOptions<SlashItem, SlashItem>, 'editor'> = {
			char: '/',
			pluginKey: new PluginKey('slashCommand'),
			allowSpaces: false,
			startOfLine: false,
			allow: isOutsideCodeBlock,
			items: ({ query }) => filterSlashItems(this.options.items(), query),
			command: ({ editor, range, props }) => props.run(editor, range),
			render: suggestionRender<SlashItem>({
				labels: this.options.labels,
				onOpenChange: this.options.onOpenChange
			})
		};
		return [Suggestion<SlashItem, SlashItem>({ editor: this.editor, ...suggestion })];
	}
});
