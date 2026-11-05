import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { Marked, type marked } from 'marked';
import { mentionExtension, type MentionCandidate } from './mention-extension';
import { SlashCommand, slashItems, type SlashMenuOptions } from './slash-command';
import type { SuggestionLabels } from './suggestion-render';
import { TextAlign } from './text-align-extension';

export type EditorExtensionOptions = {
	placeholder: string;
	characterLimit?: number;
	slashMenu: SlashMenuOptions;
	slashLabels: SuggestionLabels;
	mentionLabels: SuggestionLabels;
	mentions?: () => readonly MentionCandidate[];
	onSuggestionOpenChange: (open: boolean) => void;
};

/**
 * Tiptap's Markdown support registers its tokenizers on the `marked` it is given, and the shared default would
 * collect them again for every editor ever opened. Each editor gets its own instance; the option is typed as the
 * default export, which an instance matches at runtime (lexer, Lexer, defaults, use, setOptions).
 */
function ownMarkedInstance() {
	return new Marked() as unknown as typeof marked;
}

/**
 * The schema of one editor. Descriptions are stored as HTML, so underline and alignment survive here (they would not
 * in Markdown); Markdown is only the language of the writing help and of pasted plain text.
 */
export function buildExtensions(options: EditorExtensionOptions): Extensions {
	const extensions: Extensions = [
		StarterKit.configure({
			heading: { levels: [1, 2, 3, 4, 5, 6] },
			dropcursor: { color: 'hsl(var(--primary))', width: 2 },
			link: {
				openOnClick: false,
				autolink: true,
				linkOnPaste: true,
				enableClickSelection: true,
				defaultProtocol: 'https'
			},
			codeBlock: {
				HTMLAttributes: { spellcheck: 'false' }
			}
		}),
		Markdown.configure({
			marked: ownMarkedInstance(),
			markedOptions: { gfm: true, breaks: true }
		}),
		Placeholder.configure({
			placeholder: options.placeholder,
			showOnlyWhenEditable: true,
			showOnlyCurrent: true
		}),
		CharacterCount.configure({ limit: options.characterLimit ?? null }),
		Image.configure({ inline: false, allowBase64: false }),
		TaskList,
		TaskItem.configure({ nested: true }),
		TextAlign,
		SlashCommand.configure({
			items: () => slashItems(options.slashMenu),
			labels: () => options.slashLabels,
			onOpenChange: options.onSuggestionOpenChange
		})
	];

	if (options.mentions) {
		extensions.push(
			mentionExtension({
				candidates: options.mentions,
				labels: () => options.mentionLabels,
				onOpenChange: options.onSuggestionOpenChange
			})
		);
	}

	return extensions;
}
