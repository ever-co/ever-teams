'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Camera, Mic, VideoOff, Volume } from '@/core/components/icons';
import {
	DEVICE_FIELD,
	useDeviceStream,
	useStoredMeetingChoices,
	type MeetingDeviceChoices,
	type MeetingDeviceKind
} from '@/core/hooks/meetings/use-media-preview';
import { cn } from '@/core/lib/helpers';
import { DeviceAccessNotices, DeviceField } from '../pre-join/device-fields';

type DeviceDraft = Pick<MeetingDeviceChoices, 'audioInputId' | 'videoInputId' | 'audioOutputId'>;

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
		audioOutputId: choices.audioOutputId
	}));
	// Both devices open here, whatever the person joins with: the settings are about which ones
	const media = useDeviceStream(
		{ audioEnabled: true, videoEnabled: true, audioInputId: draft.audioInputId, videoInputId: draft.videoInputId },
		() => setDraft((current) => ({ ...current, audioInputId: '', videoInputId: '' }))
	);
	const videoRef = useRef<HTMLVideoElement>(null);
	const hasVideo = Boolean(media.stream?.getVideoTracks().length);
	const canChooseDevices = media.access === 'granted' || media.access === 'pending';

	useEffect(() => {
		const video = videoRef.current;
		if (video) {
			video.srcObject = hasVideo ? media.stream : null;
		}
	}, [hasVideo, media.stream]);

	const select = (kind: MeetingDeviceKind, deviceId: string) =>
		setDraft((current) => ({ ...current, [DEVICE_FIELD[kind]]: deviceId }));

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
					<div className="flex flex-col gap-4">
						<DeviceField
							label={t('meetings.CAMERA')}
							icon={<Camera className="size-4" />}
							kind="videoinput"
							value={draft.videoInputId}
							devices={media.devices.videoinput}
							onChange={select}
						/>
						{media.canPickSpeaker && media.devices.audiooutput.length > 0 && (
							<DeviceField
								label={t('meetings.SPEAKER')}
								icon={<Volume className="size-4" />}
								kind="audiooutput"
								value={draft.audioOutputId}
								devices={media.devices.audiooutput}
								onChange={select}
							/>
						)}
						<DeviceField
							label={t('meetings.MICROPHONE')}
							icon={<Mic className="size-4" />}
							kind="audioinput"
							value={draft.audioInputId}
							devices={media.devices.audioinput}
							onChange={select}
						/>
					</div>
				)}
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
