import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LazyRichEditor } from '@/core/components/common/rich-editor/lazy-rich-editor';
import { RichTextView } from '@/core/components/common/rich-editor/rich-text-view';
import type { RichEditorStats } from '@/core/components/common/rich-editor/rich-editor';
import { controlGroupRecipe } from '@/core/components/common/input';
import { useTeamMentionCandidates } from '@/core/hooks/organizations/teams/use-team-mention-candidates';
import { storedTextToEditorHtml } from '@/core/lib/helpers/rich-text-format';
import { cn } from '@/core/lib/helpers';

const WORD_LIMIT = 5000;

interface IRichTextProps {
	defaultValue?: string;
	readonly?: boolean;
	onChange?: (value: string) => void;
	/** Called when the word count validity changes (true = within limit, false = over 5000 words) */
	onValidityChange?: (valid: boolean) => void;
	/** The project name, read by the writing help as context. */
	title?: string;
}

const countWords = (text: string) => {
	return text
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 0).length;
};

function initialWordCountOf(defaultValue: string | undefined) {
	const html = storedTextToEditorHtml(defaultValue);
	if (!html) {
		return 0;
	}
	if (typeof DOMParser === 'undefined') {
		return countWords(defaultValue ?? '');
	}
	const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
	return countWords(text);
}

/** The project description field: the rich editor (HTML out, as Gauzy stores it) with the 5000-word limit below it. */
const RichTextEditor = ({ readonly = false, onChange, defaultValue, onValidityChange, title }: IRichTextProps) => {
	const t = useTranslations();
	const mentions = useTeamMentionCandidates();
	const [value, setValue] = useState(defaultValue ?? '');
	const [wordCount, setWordCount] = useState(() => initialWordCountOf(defaultValue));

	useEffect(() => {
		onValidityChange?.(wordCount <= WORD_LIMIT);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

	if (readonly) {
		return <RichTextView value={defaultValue} className="px-3 py-2.5" />;
	}

	const handleChange = (html: string, stats: RichEditorStats) => {
		setValue(html);
		setWordCount(stats.words);
		onValidityChange?.(stats.words <= WORD_LIMIT);
		onChange?.(html);
	};

	const isOverWordLimit = wordCount > WORD_LIMIT;

	return (
		<div className={cn(controlGroupRecipe, 'flex-col items-stretch')}>
			<LazyRichEditor
				value={value}
				onChange={handleChange}
				chrome="bare"
				ai={{ context: 'project', title }}
				mentions={mentions}
				contentClassName="min-h-20 max-h-60 overflow-y-auto"
				aria-label={t('richEditor.EDIT_DESCRIPTION')}
			/>
			<div
				className={cn(
					'hairline-t border-border px-3 py-1.5 text-right text-xs tabular-nums',
					isOverWordLimit && 'text-destructive-ink',
					!isOverWordLimit && 'text-muted-foreground'
				)}
			>
				{t('richEditor.WORD_COUNT', { count: wordCount, max: WORD_LIMIT })}
			</div>
		</div>
	);
};

export default RichTextEditor;
