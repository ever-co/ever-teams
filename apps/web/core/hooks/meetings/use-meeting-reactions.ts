'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDataChannel, useLocalParticipant } from '@livekit/components-react';

/** The reactions one can send: approval, applause, laughter, love, surprise and celebration. */
export const MEETING_REACTIONS = ['👍', '👏', '😂', '❤️', '😮', '🎉'] as const;

export type MeetingReaction = (typeof MEETING_REACTIONS)[number];

/** Reactions travel on the room's data channel under this topic, apart from the chat's messages. */
const REACTION_TOPIC = 'ever-teams.reaction';
/** How long a reaction stays over the room. */
const SHOWN_MS = 4000;
/** A burst of reactions keeps the latest few on screen. */
const MAX_SHOWN = 12;

/** What the room's data channel hands over: the bytes sent, and who sent them. */
interface DataMessage {
	payload: Uint8Array;
	from?: { name?: string; identity: string };
}

export interface ShownReaction {
	id: number;
	emoji: MeetingReaction;
	/** Who sent it. */
	name: string;
}

/** The reaction a data message carries; null for anything else, so no other text ever reaches the screen. */
export function reactionOfPayload(payload: Uint8Array): MeetingReaction | null {
	try {
		const text = new TextDecoder('utf-8', { fatal: true }).decode(payload);
		return (MEETING_REACTIONS as readonly string[]).includes(text) ? (text as MeetingReaction) : null;
	} catch {
		return null;
	}
}

/**
 * The room's reactions: one sends an emoji to everyone over the room's data channel, and each one, sent or received,
 * shows briefly over the room with who sent it.
 */
export function useMeetingReactions() {
	const [shown, setShown] = useState<ShownReaction[]>([]);
	const lastId = useRef(0);
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
	const { localParticipant } = useLocalParticipant();

	const show = useCallback((emoji: MeetingReaction, name: string) => {
		lastId.current += 1;
		const id = lastId.current;
		setShown((current) => [...current, { id, emoji, name }].slice(-MAX_SHOWN));
		const timer = setTimeout(() => {
			timers.current.delete(timer);
			setShown((current) => current.filter((reaction) => reaction.id !== id));
		}, SHOWN_MS);
		timers.current.add(timer);
	}, []);

	const receive = useCallback(
		(message: DataMessage) => {
			const emoji = reactionOfPayload(message.payload);
			if (emoji) {
				show(emoji, message.from?.name || message.from?.identity || '');
			}
		},
		[show]
	);
	const { send } = useDataChannel(REACTION_TOPIC, receive);

	const react = useCallback(
		async (emoji: MeetingReaction) => {
			// The data channel does not echo one's own messages: the reaction shows here at once
			show(emoji, localParticipant.name || localParticipant.identity);
			try {
				await send(new TextEncoder().encode(emoji), { reliable: true });
			} catch {
				// The room went away meanwhile: nobody is left to see it
			}
		},
		[localParticipant, send, show]
	);

	useEffect(() => {
		const pending = timers.current;
		return () => {
			for (const timer of pending) clearTimeout(timer);
			pending.clear();
		};
	}, []);

	return { shown, react };
}
