import { getSchema, type Extensions } from '@tiptap/core';
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
	/** Live editing: the editor binds this shared document (and its co-editors' carets) instead of holding its own text. */
	collaboration?: EditorCollaboration | null;
};

/**
 * Live editing: the extensions that bind the editor to a shared document (see `live-collaboration.ts`, which the
 * live pages load; the other editors never carry them).
 */
export type EditorCollaboration = {
	extensions: Extensions;
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
	const collaboration = options.collaboration ?? null;
	const extensions: Extensions = [
		StarterKit.configure({
			// Live, the shared document keeps the history (each person undoes their own edits): the two exclude each other.
			...(collaboration ? { undoRedo: false as const } : {}),
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

	if (collaboration) extensions.push(...collaboration.extensions);

	return extensions;
}

/**
 * The node and mark types of the editor's schema (with mentions and pictures, as the Docs pages use it), known before
 * any editor exists: a live document is checked against them before an editor is bound to it.
 */
export function editorSchemaTypes(): { nodes: Set<string>; marks: Set<string> } {
	const schema = getSchema(schemaExtensions());
	return { nodes: new Set(Object.keys(schema.nodes)), marks: new Set(Object.keys(schema.marks)) };
}

/** The extensions of a Docs editor for what they define (its schema, its HTML), without an editor around them. */
export function schemaExtensions(): Extensions {
	const noLabels = { emptyLabel: '', loadingLabel: '', ariaLabel: '' };
	return buildExtensions({
			placeholder: '',
			slashMenu: {
				copy: {} as SlashMenuOptions['copy'],
				handlers: { pickImage: () => undefined, openAi: () => undefined },
				imagesEnabled: true,
				aiEnabled: false
			},
			slashLabels: noLabels,
			mentionLabels: noLabels,
			mentions: () => [],
			onSuggestionOpenChange: () => undefined
		});
}
