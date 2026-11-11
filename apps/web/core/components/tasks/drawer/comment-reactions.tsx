'use client';

import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Smile } from '@/core/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { EmojiPopover } from '@/core/components/pages/chat/emoji-popover';
import { cn } from '@/core/lib/helpers';
import { joinReactorNames, namedReactors } from '@/core/lib/utils/comment-reactions';
import type { IReactionSummary } from '@/core/types/interfaces/common/reaction';
import { useCommentActions } from './comment-actions-context';

const NO_REACTIONS: IReactionSummary[] = [];

/** Touch screens get the taller pill: no control of the bar is hover-only. */
const REACTION_PILL =
	'inline-flex h-6 cursor-pointer items-center justify-center rounded-full px-2 text-xs outline-none hairline-ring transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25 [@media(pointer:coarse)]:h-8';

const TOOLTIP_DELAY_MS = 300;

/**
 * The reactions under a comment (`NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED`): one chip per emoji with its count (the
 * reader's own in the brand ink), a tooltip naming who reacted, and a button opening the picker. Clicking a chip
 * adds or takes back the reader's reaction. Nothing shows while reactions are off or
 * the platform has no summary to give.
 */
export function CommentReactions({ commentId }: Readonly<{ commentId: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const actions = useCommentActions();
	if (!actions?.reactions.isAvailable) {
		return null;
	}
	const { reactions, reader } = actions;
	const summaries = reactions.byComment.get(commentId) ?? NO_REACTIONS;
	const canReact = reactions.canReact;
	if (summaries.length === 0 && !canReact) {
		return null;
	}

	const react = async (emoji: string) => {
		const isSaved = await reactions.toggle(commentId, emoji);
		if (!isSaved) {
			toast.error(t('taskComments.REACTION_FAILED'));
		}
	};

	const whoReacted = (summary: IReactionSummary) => {
		const named = namedReactors(summary, {
			meEmployeeId: reader.employeeId,
			meLabel: t('taskComments.YOU'),
			unknownLabel: t('taskDrawer.SOMEONE')
		});
		const people = joinReactorNames(named, locale, (count) => t('taskComments.OTHERS', { count }));
		return t('taskComments.REACTED_WITH', { people, emoji: summary.emoji });
	};

	return (
		<div className="flex flex-wrap items-center gap-1 pt-0.5">
			{summaries.map((summary) => {
				const label = whoReacted(summary);
				return (
					<Tooltip key={summary.emoji}>
						<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
							<button
								type="button"
								disabled={!canReact}
								onClick={() => void react(summary.emoji)}
								aria-pressed={summary.reactedByMe}
								aria-label={label}
								className={cn(
									REACTION_PILL,
									'min-w-10 gap-1 disabled:cursor-default',
									summary.reactedByMe
										? 'bg-primary/10 font-medium text-primary ring-primary/40 hover:bg-primary/15'
										: 'bg-foreground/[0.03] text-foreground ring-border hover:bg-foreground/[0.07]'
								)}
							>
								<span className="text-sm leading-none">{summary.emoji}</span>
								<span className="tabular-nums">{summary.count}</span>
							</button>
						</TooltipTrigger>
						<TooltipContent className="max-w-64 text-center">{label}</TooltipContent>
					</Tooltip>
				);
			})}
			{canReact && (
					<EmojiPopover
						label={t('taskComments.ADD_REACTION')}
						onPick={(emoji) => void react(emoji)}
						className={cn(
							REACTION_PILL,
							'gap-px text-muted-foreground ring-border hover:bg-foreground/[0.05] hover:text-foreground data-[popup-open]:bg-foreground/[0.05]'
						)}
					>
						<Smile className="size-3.5" />
						<Plus className="size-2.5" />
					</EmojiPopover>
			)}
		</div>
	);
}
