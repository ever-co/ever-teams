'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
	StartMediaButton,
	useLocalParticipantPermissions,
	useMaybeLayoutContext,
	useRoomContext,
	useTrackToggle
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import {
	Camera,
	MessageCircle,
	Mic,
	MicOff,
	PhoneOff,
	ScreenShare,
	Settings,
	Smile,
	Users,
	VideoOff
} from '@/core/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { MEETING_REACTIONS, type MeetingReaction } from '@/core/hooks/meetings/use-meeting-reactions';
import { cn } from '@/core/lib/helpers';

/** The protocol's numbers of the sources a participant may be allowed to publish. */
const SOURCE_NUMBERS = { [Track.Source.Camera]: 1, [Track.Source.Microphone]: 2, [Track.Source.ScreenShare]: 3 };

const BAR_BUTTON =
	'relative flex min-w-14 cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-foreground/[0.08]';
const ROUND_ICON = 'flex size-10 items-center justify-center rounded-full [&_svg]:size-5';

function canShareScreens(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

interface BarButtonProps {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	/** A switch that is on, or a panel that is open. */
	isPressed?: boolean;
	/** A device that is off, shown red as in the inspiration. */
	isOff?: boolean;
	disabled?: boolean;
	badge?: ReactNode;
	testId?: string;
}

function BarButton({
	icon,
	label,
	onClick,
	isPressed,
	isOff = false,
	disabled,
	badge,
	testId
}: Readonly<BarButtonProps>) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={isPressed}
			disabled={disabled}
			data-testid={testId}
			className={cn(BAR_BUTTON, isOff && 'text-destructive-ink')}
		>
			<span
				aria-hidden="true"
				className={cn(ROUND_ICON, isOff ? 'bg-destructive text-white' : 'bg-transparent [&_svg]:size-5')}
			>
				{icon}
			</span>
			<span>{label}</span>
			{badge}
		</button>
	);
}

/**
 * The room's controls, laid out as in the inspiration: one's camera and microphone on the left, with words that say
 * what a press does; what the room offers in the middle; the settings and leaving on the right.
 */
interface MeetControlBarProps {
	/** The People panel is open; it and the chat take the same place, one at a time. */
	isPeopleOpen: boolean;
	onPeopleOpenChange: (isOpen: boolean) => void;
	/** Sends a reaction to everyone in the room. */
	onReact: (emoji: MeetingReaction) => void;
}

export function MeetControlBar({ isPeopleOpen, onPeopleOpenChange, onReact }: Readonly<MeetControlBarProps>) {
	const t = useTranslations();
	const room = useRoomContext();
	const layoutContext = useMaybeLayoutContext();
	const permissions = useLocalParticipantPermissions();
	const camera = useTrackToggle({ source: Track.Source.Camera });
	const microphone = useTrackToggle({ source: Track.Source.Microphone });
	const screenShare = useTrackToggle({
		source: Track.Source.ScreenShare,
		captureOptions: { audio: true, selfBrowserSurface: 'include' }
	});
	const widget = layoutContext?.widget;
	const unreadMessages = widget?.state?.unreadMessages ?? 0;
	const isChatOpen = Boolean(widget?.state?.showChat);
	const [isReactionsOpen, setIsReactionsOpen] = useState(false);

	const togglePeople = () => {
		if (!isPeopleOpen && isChatOpen) widget?.dispatch?.({ msg: 'toggle_chat' });
		onPeopleOpenChange(!isPeopleOpen);
	};

	const toggleChat = () => {
		if (isPeopleOpen) onPeopleOpenChange(false);
		widget?.dispatch?.({ msg: 'toggle_chat' });
	};

	const canPublish = (source: Track.Source.Camera | Track.Source.Microphone | Track.Source.ScreenShare) =>
		Boolean(
			permissions?.canPublish &&
			(permissions.canPublishSources.length === 0 ||
				permissions.canPublishSources.includes(SOURCE_NUMBERS[source]))
		);

	return (
		<div
			role="group"
			aria-label={t('meetings.MEETING_CONTROLS')}
			data-testid="meet-control-bar"
			className="flex shrink-0 flex-wrap items-center justify-between gap-2 hairline-t border-border bg-card px-2 py-2 text-foreground sm:px-4"
		>
			<div className="flex items-center gap-1">
				{canPublish(Track.Source.Camera) && (
					<BarButton
						icon={camera.enabled ? <Camera /> : <VideoOff />}
						label={camera.enabled ? t('meetings.STOP_VIDEO') : t('meetings.START_VIDEO')}
						isOff={!camera.enabled}
						disabled={camera.pending}
						onClick={() => void camera.toggle()}
					/>
				)}
				{canPublish(Track.Source.Microphone) && (
					<BarButton
						icon={microphone.enabled ? <Mic /> : <MicOff />}
						label={microphone.enabled ? t('meetings.MUTE') : t('meetings.UNMUTE')}
						isOff={!microphone.enabled}
						disabled={microphone.pending}
						onClick={() => void microphone.toggle()}
					/>
				)}
			</div>
			<div className="flex items-center gap-1">
				<BarButton
					icon={<Users />}
					label={t('meetings.PEOPLE')}
					isPressed={isPeopleOpen}
					onClick={togglePeople}
					testId="meet-control-people"
				/>
				{permissions?.canPublishData && widget && (
					<BarButton
						icon={<MessageCircle />}
						label={t('meetings.CHAT')}
						isPressed={isChatOpen}
						onClick={toggleChat}
						badge={
							unreadMessages > 0 && (
								<span className="absolute right-2 top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground tabular-nums">
									{unreadMessages}
									<span className="sr-only">
										{t('meetings.UNREAD_MESSAGES', { count: unreadMessages })}
									</span>
								</span>
							)
						}
					/>
				)}
				{canPublish(Track.Source.ScreenShare) && canShareScreens() && (
					<BarButton
						icon={<ScreenShare />}
						label={screenShare.enabled ? t('meetings.STOP_SHARING') : t('meetings.SHARE')}
						isPressed={screenShare.enabled}
						disabled={screenShare.pending}
						onClick={() => void screenShare.toggle()}
					/>
				)}
				{permissions?.canPublishData && (
					<Popover open={isReactionsOpen} onOpenChange={setIsReactionsOpen}>
						<PopoverTrigger className={BAR_BUTTON} data-testid="meet-control-reactions">
							<span aria-hidden="true" className={ROUND_ICON}>
								<Smile />
							</span>
							<span>{t('meetings.REACTIONS')}</span>
						</PopoverTrigger>
						<PopoverContent side="top" className="w-auto p-1.5">
							<div role="group" aria-label={t('meetings.REACTIONS')} className="flex gap-1">
								{MEETING_REACTIONS.map((emoji) => (
									<button
										key={emoji}
										type="button"
										onClick={() => onReact(emoji)}
										className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-2xl outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-[3px] focus-visible:ring-ring/25"
									>
										{emoji}
									</button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
			<div className="flex items-center gap-1">
				<StartMediaButton className="lk-button" />
				{widget && (
					<BarButton
						icon={<Settings />}
						label={t('meetings.SETTINGS')}
						isPressed={Boolean(widget.state?.showSettings)}
						onClick={() => widget.dispatch?.({ msg: 'toggle_settings' })}
					/>
				)}
				<BarButton
					icon={<PhoneOff />}
					label={t('meetings.LEAVE')}
					isOff
					onClick={() => void room.disconnect()}
					testId="meet-control-leave"
				/>
			</div>
		</div>
	);
}
