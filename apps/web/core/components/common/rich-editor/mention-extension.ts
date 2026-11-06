import Mention from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';
import type { SuggestionEntry } from './suggestion-list';
import { suggestionRender, type SuggestionLabels } from './suggestion-render';

export type MentionCandidate = { id: string; name: string; imageUrl?: string | null };

type MentionItem = SuggestionEntry & { label: string };

const MAX_MENTION_ITEMS = 6;

function matchesName(candidate: MentionCandidate, query: string) {
	if (!query) {
		return true;
	}
	return candidate.name.toLowerCase().includes(query);
}

function toMentionItem(candidate: MentionCandidate): MentionItem {
	return {
		id: candidate.id,
		label: candidate.name,
		title: candidate.name,
		person: { name: candidate.name, imageUrl: candidate.imageUrl }
	};
}

/**
 * "@" mentions of the active team's members. Candidates are read through a getter, so a member who joins shows up
 * without rebuilding the editor. Stored as `<span data-type="mention" data-id data-label>@Name</span>`, which the
 * mobile app and the Gauzy UI render as plain text.
 */
export function mentionExtension(options: {
	candidates: () => readonly MentionCandidate[];
	labels: () => SuggestionLabels;
	onOpenChange?: (open: boolean) => void;
}) {
	return Mention.configure({
		HTMLAttributes: { class: 'mention' },
		deleteTriggerWithBackspace: true,
		renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
		suggestion: {
			char: '@',
			pluginKey: new PluginKey('mentionSuggestion'),
			allowSpaces: false,
			items: ({ query }): MentionItem[] => {
				const normalized = query.trim().toLowerCase();
				const matching = options.candidates().filter((candidate) => matchesName(candidate, normalized));
				const shown = matching.slice(0, MAX_MENTION_ITEMS);
				return shown.map(toMentionItem);
			},
			render: suggestionRender<MentionItem>({
				labels: options.labels,
				onOpenChange: options.onOpenChange
			})
		}
	});
}
