'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Camera, Mic, Play, VideoOff, Volume } from '@/core/components/icons';
import { useAudioLevel } from '@/core/hooks/meetings/use-audio-level';
import {
	DEVICE_FIELD,
	useDeviceStream,
	useStoredMeetingChoices,
	type MeetingDeviceChoices,
	type MeetingDeviceKind
} from '@/core/hooks/meetings/use-media-preview';
import { useSpeakerTest } from '@/core/hooks/meetings/use-speaker-test';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { cn } from '@/core/lib/helpers';
import { DeviceAccessNotices, DeviceField, LevelMeter } from '../pre-join/device-fields';

type DeviceDraft = Pick<
	MeetingDeviceChoices,
	'audioInputId' | 'videoInputId' | 'audioOutputId' | 'noiseFilter' | 'hdVideo'
>;

function SwitchRow({
	title,
	hint,
	checked,
	onCheckedChange,
	testId
}: Readonly<{
	title: string;
	hint: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	testId: string;
}>) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-sm font-medium text-foreground">{title}</span>
				<span className="text-xs text-muted-foreground">{hint}</span>
			</div>
			<SettingsSwitch
				checked={checked}
				onCheckedChange={onCheckedChange}
				ariaLabel={title}
				data-testid={testId}
			/>
		</div>
	);
}

/**
 * The settings' body, mounted while the dialog is open: the camera and the microphone are on only then. It works on a
 * draft of the device choices, which Save keeps where the pre-join check reads them and Cancel drops.
 */
function VideoAudioSettings({ onClose }: Readonly<{ onClose: () => void }>) {
	const t = useTranslations();
	const { choices, saveChoices } = useStoredMeetingChoices();
	const [draft, setDraft] = useState<DeviceDraft>(() => ({
		audioInputId: choices.audioInputId,
		videoInputId: choices.videoInputId,
		audioOutputId: choices.audioOutputId,
		noiseFilter: choices.noiseFilter,
		hdVideo: choices.hdVideo
	}));
	// Both devices open here, whatever the person joins with: the settings are about which ones
	const media = useDeviceStream(
		{ audioEnabled: true, videoEnabled: true, audioInputId: draft.audioInputId, videoInputId: draft.videoInputId },
		() => setDraft((current) => ({ ...current, audioInputId: '', videoInputId: '' }))
	);
	const videoRef = useRef<HTMLVideoElement>(null);
	const hasVideo = Boolean(media.stream?.getVideoTracks().length);
	const canChooseDevices = media.access === 'granted' || media.access === 'pending';
	const canPickSpeaker = canChooseDevices && media.canPickSpeaker && media.devices.audiooutput.length > 0;
	const speakerTest = useSpeakerTest();
	const speakerLevel = useAudioLevel(speakerTest.toneStream);
	// The microphone is open with the dialog; its meter listens only while it is tested
	const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
	const hasMicrophone = Boolean(media.stream?.getAudioTracks().length);
	const microphoneLevel = useAudioLevel(isTestingMicrophone && hasMicrophone ? media.stream : null);

	useEffect(() => {
		const video = videoRef.current;
		if (video) {
			video.srcObject = hasVideo ? media.stream : null;
		}
	}, [hasVideo, media.stream]);

	const select = (kind: MeetingDeviceKind, deviceId: string) =>
		setDraft((current) => ({ ...current, [DEVICE_FIELD[kind]]: deviceId }));

	const testSpeaker = () => {
		if (speakerTest.isPlaying) {
			speakerTest.stop();
			return;
		}
		void speakerTest.play(draft.audioOutputId);
	};

	const save = () => {
		saveChoices(draft);
		onClose();
	};

	return (
		<>
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-4 pb-4')} data-testid="meeting-video-audio">
				<section
					aria-label={t('meetings.PREVIEW')}
					className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900"
				>
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						className={cn('size-full -scale-x-100 object-cover', !hasVideo && 'hidden')}
					/>
					{!hasVideo && (
						<span className="absolute inset-0 flex items-center justify-center text-white/70">
							<VideoOff className="size-8" aria-hidden="true" />
						</span>
					)}
				</section>
				<DeviceAccessNotices access={media.access} missing={media.missing} onRetry={media.retry} />
				{canChooseDevices && (
					<DeviceField
						label={t('meetings.CAMERA')}
						icon={<Camera className="size-4" />}
						kind="videoinput"
						value={draft.videoInputId}
						devices={media.devices.videoinput}
						onChange={select}
					/>
				)}
				{/* The tone needs no device access: the speaker test is there even when the camera is blocked */}
				<div className="flex flex-col gap-2">
					{canPickSpeaker ? (
						<DeviceField
							label={t('meetings.SPEAKER')}
							icon={<Volume className="size-4" />}
							kind="audiooutput"
							value={draft.audioOutputId}
							devices={media.devices.audiooutput}
							onChange={select}
						/>
					) : (
						<span className="text-xs font-medium text-muted-foreground">{t('meetings.SPEAKER')}</span>
					)}
					<div className="flex items-center justify-between gap-3">
						<Button
							type="button"
							variant="secondary"
							aria-pressed={speakerTest.isPlaying}
							onClick={testSpeaker}
						>
							<Play className="size-4" aria-hidden="true" />
							{t('meetings.TEST_SPEAKER')}
						</Button>
						<LevelMeter level={speakerLevel} label={t('meetings.SPEAKER_LEVEL')} tone="light" />
					</div>
				</div>
				{canChooseDevices && (
					<div className="flex flex-col gap-2">
						<DeviceField
							label={t('meetings.MICROPHONE')}
							icon={<Mic className="size-4" />}
							kind="audioinput"
							value={draft.audioInputId}
							devices={media.devices.audioinput}
							onChange={select}
						/>
						<div className="flex items-center justify-between gap-3">
							<Button
								type="button"
								variant="secondary"
								aria-pressed={isTestingMicrophone}
								disabled={!hasMicrophone}
								onClick={() => setIsTestingMicrophone((isTesting) => !isTesting)}
							>
								<Mic className="size-4" aria-hidden="true" />
								{t('meetings.TEST_MICROPHONE')}
							</Button>
							<LevelMeter level={microphoneLevel} label={t('meetings.MIC_LEVEL')} tone="light" />
						</div>
					</div>
				)}
				<div className="flex flex-col gap-4 hairline-t border-border pt-4">
					<SwitchRow
						title={t('meetings.NOISE_FILTER')}
						hint={t('meetings.NOISE_FILTER_HINT')}
						checked={draft.noiseFilter}
						onCheckedChange={(noiseFilter) => setDraft((current) => ({ ...current, noiseFilter }))}
						testId="meeting-noise-filter"
					/>
					<SwitchRow
						title={t('meetings.HD_VIDEO')}
						hint={t('meetings.HD_VIDEO_HINT')}
						checked={draft.hdVideo}
						onCheckedChange={(hdVideo) => setDraft((current) => ({ ...current, hdVideo }))}
						testId="meeting-hd-video"
					/>
				</div>
			</div>
			<div className={cn(APP_DIALOG_FOOTER, 'justify-end')}>
				<Button type="button" variant="ghost" onClick={onClose}>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" onClick={save}>
					{t('common.SAVE_CHANGES')}
				</Button>
			</div>
		</>
	);
}

interface VideoAudioDialogProps {
	open: boolean;
	onClose: () => void;
}

/**
 * The inspiration's "Video & Audio" settings: the camera to see oneself in, the camera, speaker and microphone to use.
 * They stay on this device, where the pre-join check finds them for the next meeting.
 */
export function VideoAudioDialog({ open, onClose }: Readonly<VideoAudioDialogProps>) {
	const t = useTranslations();
	return (
		<AppDialog open={open} onClose={onClose} width="md">
			<AppDialogHeader title={t('meetings.AUDIO_AND_VIDEO')} onClose={onClose} />
			{open && <VideoAudioSettings onClose={onClose} />}
		</AppDialog>
	);
}
