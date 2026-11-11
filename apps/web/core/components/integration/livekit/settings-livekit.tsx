'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { LocalAudioTrack, Track } from 'livekit-client';
import { useMaybeLayoutContext, useLocalParticipant, MediaDeviceMenu, TrackToggle } from '@livekit/components-react';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { Copy } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

type SettingsTab = 'media' | 'effects';

const SECTION_TITLE = 'text-xs font-medium uppercase tracking-wide text-muted-foreground';

function DeviceRow({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className={SECTION_TITLE}>{title}</h3>
			<div className="lk-button-group">{children}</div>
		</section>
	);
}

/** The in-call settings of a LiveKit room: devices, the noise filter, and the link to invite others. */
export function SettingsMenu({ className, ...props }: Readonly<SettingsMenuProps>) {
	const t = useTranslations();
	const TrackToggleComponent = TrackToggle as React.ElementType;
	const layoutContext = useMaybeLayoutContext();
	const { microphoneTrack } = useLocalParticipant();
	const [activeTab, setActiveTab] = React.useState<SettingsTab>('media');
	const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = React.useState(true);
	const [isNoiseFilterSupported, setIsNoiseFilterSupported] = React.useState(true);
	const [isLinkCopied, setIsLinkCopied] = React.useState(false);

	React.useEffect(() => {
		const micPublication = microphoneTrack;
		if (!(micPublication?.track instanceof LocalAudioTrack)) {
			return;
		}
		const track = micPublication.track;
		const currentProcessor = track.getProcessor();
		if (currentProcessor && !isNoiseFilterEnabled) {
			void track.stopProcessor();
			return;
		}
		if (currentProcessor || !isNoiseFilterEnabled) {
			return;
		}
		import('@livekit/krisp-noise-filter')
			.then(({ KrispNoiseFilter, isKrispNoiseFilterSupported }) => {
				if (!isKrispNoiseFilterSupported()) {
					setIsNoiseFilterSupported(false);
					setIsNoiseFilterEnabled(false);
					return;
				}
				// The filter's processor type comes from another copy of livekit-client than the track's
				return track.setProcessor(KrispNoiseFilter() as unknown as Parameters<typeof track.setProcessor>[0]);
			})
			.catch((error: unknown) => console.error('Failed to load noise filter', error));
	}, [isNoiseFilterEnabled, microphoneTrack]);

	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setIsLinkCopied(true);
		} catch {
			setIsLinkCopied(false);
		}
	};

	const tabs: Array<{ id: SettingsTab; label: string }> = [
		{ id: 'media', label: t('meetings.AUDIO_AND_VIDEO') },
		{ id: 'effects', label: t('meetings.EFFECTS') }
	];

	return (
		<div
			className={cn('fixed inset-0 flex flex-col bg-card text-foreground', className)}
			role="dialog"
			aria-label={t('meetings.SETTINGS')}
			{...props}
		>
			<div className="flex items-center gap-2 hairline-b border-border px-5 py-3">
				<h2 className="flex-1 text-base font-semibold">{t('meetings.SETTINGS')}</h2>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => layoutContext?.widget.dispatch?.({ msg: 'toggle_settings' })}
				>
					{t('common.CLOSE')}
				</Button>
			</div>

			<div role="tablist" className="flex gap-1 px-5 pt-3">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={tab.id === activeTab}
						onClick={() => setActiveTab(tab.id)}
						className={cn(
							'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
							tab.id === activeTab
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:text-foreground'
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4" role="tabpanel">
				{activeTab === 'media' && (
					<>
						<DeviceRow title={t('meetings.CAMERA')}>
							<TrackToggleComponent source={Track.Source.Camera}>
								{t('meetings.CAMERA')}
							</TrackToggleComponent>
							<div className="lk-button-group-menu">
								<MediaDeviceMenu kind="videoinput" />
							</div>
						</DeviceRow>
						<DeviceRow title={t('meetings.MICROPHONE')}>
							<TrackToggleComponent source={Track.Source.Microphone}>
								{t('meetings.MICROPHONE')}
							</TrackToggleComponent>
							<div className="lk-button-group-menu">
								<MediaDeviceMenu kind="audioinput" />
							</div>
						</DeviceRow>
						<DeviceRow title={t('meetings.SPEAKER')}>
							<span className="lk-button">{t('meetings.SPEAKER')}</span>
							<div className="lk-button-group-menu">
								<MediaDeviceMenu kind="audiooutput" />
							</div>
						</DeviceRow>
					</>
				)}
				{activeTab === 'effects' && (
					<section className="flex items-start justify-between gap-4">
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium">{t('meetings.NOISE_FILTER')}</span>
							<span className="text-xs text-muted-foreground">
								{isNoiseFilterSupported
									? t('meetings.NOISE_FILTER_HINT')
									: t('meetings.NOISE_FILTER_UNSUPPORTED')}
							</span>
						</div>
						<SettingsSwitch
							checked={isNoiseFilterEnabled}
							onCheckedChange={setIsNoiseFilterEnabled}
							disabled={!isNoiseFilterSupported}
							ariaLabel={t('meetings.NOISE_FILTER')}
						/>
					</section>
				)}
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2 hairline-t border-border px-5 py-3">
				<span className="text-sm text-muted-foreground">{t('meetings.INVITE_HINT_SHORT')}</span>
				<Button type="button" variant="outline" size="sm" onClick={copyLink}>
					<Copy className="size-4" aria-hidden="true" />
					{isLinkCopied ? t('meetings.LINK_COPIED') : t('meetings.COPY_LINK')}
				</Button>
			</div>
		</div>
	);
}
