'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlRecipe } from '@/core/components/common/input';
import { cn } from '@/core/lib/helpers';
import { formatNotificationDate } from '@/core/lib/utils/notification-inbox';
import { InboxDecision, replyOf } from '@/core/lib/utils/inbox-entry';

/**
 * A question, an approval or an escalation, answered where it is read: its choices (the recommended one marked), a
 * reason where the item asks for one (and an optional comment otherwise), or a free answer where there are no
 * choices. Once answered, the answer given.
 */
export function InboxDecisionPanel({
	decision,
	isOpen,
	onReply
}: Readonly<{
	decision: InboxDecision;
	/** Still waiting for an answer. */
	isOpen: boolean;
	/** Answers whether the platform took the answer. */
	onReply: (input: { optionId?: string; text?: string }) => Promise<boolean>;
}>) {
	const t = useTranslations();
	const locale = useLocale();
	const [optionId, setOptionId] = useState<string | null>(null);
	const [text, setText] = useState('');
	const [sending, setSending] = useState(false);
	const [missing, setMissing] = useState<'option' | 'reason' | 'answer' | null>(null);
	// The answer this pane sent: shown, locked, until the platform's own answer arrives with the refetch.
	const [sent, setSent] = useState<InboxDecision['response']>(null);
	const response = decision.response ?? sent;

	if (!response && !isOpen) {
		// Closed without an answer (cancelled, resolved elsewhere): said as such, never as answered.
		return (
			<section className="rounded-md bg-foreground/[0.04] p-3 text-sm text-muted-foreground" data-test="inbox-decision-closed">
				{t('inbox.DECISION.CLOSED')}
			</section>
		);
	}

	if (response) {
		const chosen = decision.options.find((option) => option.id === response.optionId);
		return (
			<section className="flex flex-col gap-1 rounded-md bg-foreground/[0.04] p-3 text-sm" data-test="inbox-decision-answered">
				<p className="font-medium text-foreground">
					{chosen ? t('inbox.DECISION.ANSWERED_WITH', { option: chosen.label }) : t('inbox.DECISION.ANSWERED')}
				</p>
				{response.text && <p className="whitespace-pre-wrap text-muted-foreground">{response.text}</p>}
				{response.answeredAt && <p className="text-xs text-muted-foreground">{formatNotificationDate(response.answeredAt, locale)}</p>}
			</section>
		);
	}

	const send = async () => {
		const reply = replyOf(decision, { optionId, text });
		if ('missing' in reply) {
			setMissing(reply.missing);
			return;
		}
		setSending(true);
		try {
			if (await onReply(reply.input)) {
				setSent({ optionId: reply.input.optionId ?? null, text: reply.input.text ?? null, answeredAt: new Date() });
			}
		} finally {
			setSending(false);
		}
	};

	const hasOptions = decision.options.length > 0;
	return (
		<section className="flex flex-col gap-3" data-test="inbox-decision">
			<p className="text-sm font-medium text-foreground">{t('inbox.DECISION.TITLE')}</p>
			{hasOptions && (
				<div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('inbox.DECISION.TITLE')}>
					{decision.options.map((option) => (
						<Button
							key={option.id}
							size="sm"
							type="button"
							variant={optionId === option.id ? 'default' : 'outline'}
							role="radio"
							aria-checked={optionId === option.id}
							title={option.description ?? undefined}
							onClick={() => {
								setOptionId(option.id);
								setMissing(null);
							}}
						>
							{option.label}
							{option.recommended && <span className="text-xs opacity-70">{t('inbox.DECISION.RECOMMENDED')}</span>}
						</Button>
					))}
				</div>
			)}
			<label className="flex flex-col gap-1 text-xs text-muted-foreground">
				{hasOptions
					? decision.requireReason
						? t('inbox.DECISION.REASON_REQUIRED')
						: t('inbox.DECISION.REASON_OPTIONAL')
					: t('inbox.DECISION.ANSWER_LABEL')}
				<textarea
					className={cn(controlRecipe, 'min-h-20 py-2 text-sm text-foreground')}
					value={text}
					maxLength={10000}
					onChange={(event) => {
						setText(event.target.value);
						setMissing(null);
					}}
				/>
			</label>
			{missing && <p className="text-xs text-destructive-ink">{t(`inbox.DECISION.MISSING_${missing.toUpperCase() as 'OPTION' | 'REASON' | 'ANSWER'}`)}</p>}
			<div>
				<Button size="sm" type="button" onClick={() => void send()} disabled={sending}>
					{t('inbox.DECISION.SEND')}
				</Button>
			</div>
		</section>
	);
}
