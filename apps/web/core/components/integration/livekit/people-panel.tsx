'use client';

import { useTranslations } from 'next-intl';
import { useIsMuted, useIsSpeaking, useParticipants } from '@livekit/components-react';
import { Track, type Participant } from 'livekit-client';
import { Button } from '@/core/components/duplicated-components/_button';
import { Mic, MicOff, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');
}

/** One person of the room: who, whether they speak now, and whether their microphone is on. */
function PersonRow({ participant }: Readonly<{ participant: Participant }>) {
	const t = useTranslations();
	const isMuted = useIsMuted({ participant, source: Track.Source.Microphone });
	const isSpeaking = useIsSpeaking(participant);
	const name = participant.name || participant.identity;

	return (
		<li className="flex items-center gap-3 rounded-lg px-2 py-2" data-testid="meet-person">
			<span
				aria-hidden="true"
				className={cn(
					'flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground',
					isSpeaking && 'ring-2 ring-primary'
				)}
			>
				{initialsOf(name)}
			</span>
			<span className="min-w-0 flex-1 truncate text-sm text-foreground">
				{participant.isLocal ? t('meetings.YOU', { name }) : name}
			</span>
			<span className={cn('shrink-0 [&_svg]:size-4', isMuted ? 'text-destructive-ink' : 'text-muted-foreground')}>
				{isMuted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
				<span className="sr-only">{isMuted ? t('meetings.MIC_OFF') : t('meetings.MIC_ON')}</span>
			</span>
		</li>
	);
}

/** The people in the room, oneself included, as the inspiration's People shows them. */
export function PeoplePanel({ onClose }: Readonly<{ onClose: () => void }>) {
	const t = useTranslations();
	const participants = useParticipants();

	return (
		<aside
			aria-label={t('meetings.PEOPLE')}
			data-testid="meet-people"
			className="flex w-72 max-w-full shrink-0 flex-col hairline-l border-border bg-card text-foreground"
		>
			<header className="flex items-center gap-2 px-4 py-3">
				<h2 className="flex-1 text-sm font-semibold">{t('meetings.PEOPLE')}</h2>
				<span className="text-xs tabular-nums text-muted-foreground">{participants.length}</span>
				<Button type="button" variant="ghost" size="icon-sm" aria-label={t('common.CLOSE')} onClick={onClose}>
					<X className="size-4" />
				</Button>
			</header>
			<ul className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
				{participants.map((participant) => (
					<PersonRow key={participant.identity} participant={participant} />
				))}
			</ul>
		</aside>
	);
}
