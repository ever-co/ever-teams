'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Notice } from '@/core/components/common/notice';
import { ArrowLeft, Camera, Copy, Mic, MicOff, VideoOff, Volume } from '@/core/components/icons';
import { useAudioLevel } from '@/core/hooks/meetings/use-audio-level';
import { useMediaPreview, type MeetingJoinChoices } from '@/core/hooks/meetings/use-media-preview';
import { cn } from '@/core/lib/helpers';
import { DeviceAccessNotices, DeviceField, LevelMeter } from './device-fields';

const TOGGLE =
	'flex size-11 cursor-pointer items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-white/40';

function initialsOf(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	return words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? '')
		.join('');
}

interface MeetPreJoinProps {
	/** The meeting's title, or null for a room with a random name. */
	title: string | null;
	displayName: string;
	/** The meeting was started to show the screen: it is shared once the room is joined. */
	shareScreenOnJoin?: boolean;
	onJoin: (choices: MeetingJoinChoices) => void;
	onBack: () => void;
	onCopyLink: () => void;
}

/**
 * The step before a meeting room: the person sees and hears themselves, picks devices, decides to come in with the
 * camera or the microphone off, and then joins. Nothing here talks to the meeting server.
 */
export function MeetPreJoin({
	title,
	displayName,
	shareScreenOnJoin = false,
	onJoin,
	onBack,
	onCopyLink
}: Readonly<MeetPreJoinProps>) {
	const t = useTranslations();
	const preview = useMediaPreview();
	const { choices, stream, access } = preview;
	const level = useAudioLevel(choices.audioEnabled ? stream : null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const hasVideo = choices.videoEnabled && Boolean(stream?.getVideoTracks().length);

	useEffect(() => {
		const video = videoRef.current;
		if (video) {
			video.srcObject = hasVideo ? stream : null;
		}
	}, [hasVideo, stream]);

	const join = () => {
		// None of the devices asked for was found: the request names no single one, so both stay off
		const isNothingFound = access === 'missing';
		onJoin({
			...choices,
			// A device the computer does not have stays off in the room, which would fail to open it. Only this
			// meeting: the saved choices keep what the person picked, for a computer that has the device next time.
			audioEnabled: choices.audioEnabled && !preview.missing.audio && !isNothingFound,
			videoEnabled: choices.videoEnabled && !preview.missing.video && !isNothingFound,
			displayName,
			audioInputLabel: preview.labelOf('audioinput', choices.audioInputId),
			videoInputLabel: preview.labelOf('videoinput', choices.videoInputId),
			audioOutputLabel: preview.labelOf('audiooutput', choices.audioOutputId)
		});
	};

	const micLabel = choices.audioEnabled ? t('meetings.TURN_MIC_OFF') : t('meetings.TURN_MIC_ON');
	const cameraLabel = choices.videoEnabled ? t('meetings.TURN_CAMERA_OFF') : t('meetings.TURN_CAMERA_ON');
	const canChooseDevices = access === 'granted' || access === 'pending';

	return (
		<div className="flex min-h-full w-full items-center justify-center p-4 sm:p-6">
			<div className="grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
				<section
					aria-label={t('meetings.PREVIEW')}
					className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-900"
				>
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						data-testid="meet-preview-video"
						className={cn('size-full -scale-x-100 object-cover', !hasVideo && 'hidden')}
					/>
					{!hasVideo && (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
							<span className="flex size-20 items-center justify-center rounded-full bg-white/10 text-2xl font-medium text-white">
								{initialsOf(displayName) || <VideoOff className="size-8" />}
							</span>
							<span className="text-sm">{t('meetings.CAMERA_OFF')}</span>
						</div>
					)}
					<div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-4">
						<button
							type="button"
							aria-label={micLabel}
							aria-pressed={!choices.audioEnabled}
							title={micLabel}
							onClick={preview.toggleAudio}
							className={cn(
								TOGGLE,
								choices.audioEnabled
									? 'bg-white/15 text-white hover:bg-white/25'
									: 'bg-destructive text-white'
							)}
						>
							{choices.audioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
						</button>
						<button
							type="button"
							aria-label={cameraLabel}
							aria-pressed={!choices.videoEnabled}
							title={cameraLabel}
							onClick={preview.toggleVideo}
							className={cn(
								TOGGLE,
								choices.videoEnabled
									? 'bg-white/15 text-white hover:bg-white/25'
									: 'bg-destructive text-white'
							)}
						>
							{choices.videoEnabled ? <Camera className="size-5" /> : <VideoOff className="size-5" />}
						</button>
						{choices.audioEnabled && stream && (
							<span className="ml-1">
								<LevelMeter level={level} label={t('meetings.MIC_LEVEL')} />
							</span>
						)}
					</div>
				</section>

				<section className="flex min-w-0 flex-col gap-5">
					<div className="flex flex-col gap-1">
						<p className="text-sm text-muted-foreground">{t('meetings.READY_TO_JOIN')}</p>
						<h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
							{title ?? t('meetings.UNTITLED')}
						</h1>
						<p className="text-sm text-muted-foreground">
							{t('meetings.JOINING_AS', { name: displayName })}
						</p>
					</div>

					{shareScreenOnJoin && <Notice tone="info" title={t('meetings.SHARE_SCREEN_ON_JOIN')} />}
					<DeviceAccessNotices access={access} missing={preview.missing} onRetry={preview.retry} />

					{canChooseDevices && (
						<div className="grid gap-3">
							<DeviceField
								label={t('meetings.CAMERA')}
								icon={<Camera className="size-4" />}
								kind="videoinput"
								value={choices.videoInputId}
								devices={preview.devices.videoinput}
								onChange={preview.selectDevice}
							/>
							<DeviceField
								label={t('meetings.MICROPHONE')}
								icon={<Mic className="size-4" />}
								kind="audioinput"
								value={choices.audioInputId}
								devices={preview.devices.audioinput}
								onChange={preview.selectDevice}
							/>
							{preview.canPickSpeaker && preview.devices.audiooutput.length > 0 && (
								<DeviceField
									label={t('meetings.SPEAKER')}
									icon={<Volume className="size-4" />}
									kind="audiooutput"
									value={choices.audioOutputId}
									devices={preview.devices.audiooutput}
									onChange={preview.selectDevice}
								/>
							)}
						</div>
					)}

					<div className="flex flex-wrap items-center gap-2">
						<Button type="button" size="lg" className="min-w-32" onClick={join} data-testid="meet-join-now">
							{t('meetings.JOIN_NOW')}
						</Button>
						<Button type="button" variant="outline" size="lg" onClick={onCopyLink}>
							<Copy className="size-4" aria-hidden="true" />
							{t('meetings.COPY_LINK')}
						</Button>
					</div>
					<Button type="button" variant="ghost" size="sm" className="self-start" onClick={onBack}>
						<ArrowLeft className="size-4" aria-hidden="true" />
						{t('meetings.BACK_TO_MEETINGS')}
					</Button>
				</section>
			</div>
		</div>
	);
}
