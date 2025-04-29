'use client';
import * as React from 'react';
import { LocalAudioTrack, Track } from 'livekit-client';
import { useMaybeLayoutContext, useLocalParticipant, MediaDeviceMenu, TrackToggle } from '@livekit/components-react';
import { Button } from '@/core/components/ui/button';
import styles from '@/styles/settings.module.css';
import { shortenLink } from '@/lib/utils';
import { IconsContentCopy, IconsLoader } from '@/icons';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SettingsMenuProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SettingsMenu(props: SettingsMenuProps) {
	const TrackToggleComponent = TrackToggle as React.ElementType;

	const layoutContext = useMaybeLayoutContext();
	const [copied, setCopied] = React.useState<boolean>(false);

	const getTeamLink = React.useCallback(() => {
		if (typeof window !== 'undefined') {
			return `${window.location.origin}/meet/livekit?roomName=${window.localStorage.getItem('current-room-live-kit')}`;
		}
		return '';
	}, []);

	const settings = React.useMemo(() => {
		return {
			media: { camera: true, microphone: true, label: 'Media Devices', speaker: true },
			effects: { label: 'Effects' }
		};
	}, []);

	const tabs = React.useMemo(() => Object.keys(settings) as Array<keyof typeof settings>, [settings]);
	const { microphoneTrack } = useLocalParticipant();
	const [activeTab, setActiveTab] = React.useState(tabs[0]);
	const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = React.useState(true);
	React.useEffect(() => {
		const micPublication = microphoneTrack;
		if (micPublication && micPublication.track instanceof LocalAudioTrack) {
			const currentProcessor = micPublication.track.getProcessor();
			if (currentProcessor && !isNoiseFilterEnabled) {
				micPublication.track.stopProcessor();
			} else if (!currentProcessor && isNoiseFilterEnabled) {
				import('@livekit/krisp-noise-filter')
					.then(({ KrispNoiseFilter, isKrispNoiseFilterSupported }) => {
						if (!isKrispNoiseFilterSupported()) {
							console.error('Enhanced noise filter is not supported for this browser');
							setIsNoiseFilterEnabled(false);
							return;
						}
						micPublication?.track
							// @ts-ignore
							?.setProcessor(KrispNoiseFilter())
							.then(() => console.log('successfully set noise filter'));
					})
					.catch((e) => console.error('Failed to load noise filter', e));
			}
		}
	}, [isNoiseFilterEnabled, microphoneTrack]);

	return (
		<div
			className="fixed inset-0 items-center bg-light--theme-light dark:bg-dark--theme-light indent-0 justify-cent"
			style={{ width: '100%', height: '100%' }}
			{...props}
		>
			<div className={`${styles.tabs} p-5`}>
				{tabs.map(
					(tab) =>
						settings[tab] && (
							<button
								className={`${styles.tab} lk-button`}
								key={tab}
								onClick={() => setActiveTab(tab)}
								aria-pressed={tab === activeTab}
							>
								{
									// @ts-ignore
									settings[tab].label
								}
							</button>
						)
				)}
			</div>
			<div className="p-5 tab-content">
				{activeTab === 'media' && (
					<>
						{settings.media && settings.media.camera && (
							<>
								<h3>Camera</h3>
								<section className="lk-button-group">
									<TrackToggleComponent source={Track.Source.Camera}>Camera</TrackToggleComponent>
									<div className="lk-button-group-menu">
										<MediaDeviceMenu kind="videoinput" />
									</div>
								</section>
							</>
						)}
						{settings.media && settings.media.microphone && (
							<>
								<h3>Microphone</h3>
								<section className="lk-button-group">
									<TrackToggleComponent source={Track.Source.Microphone}>
										Microphone
									</TrackToggleComponent>
									<div className="lk-button-group-menu">
										<MediaDeviceMenu kind="audioinput" />
									</div>
								</section>
							</>
						)}
						{settings.media && settings.media.speaker && (
							<>
								<h3>Speaker & Headphones</h3>
								<section className="lk-button-group">
									<span className="lk-button">Audio Output</span>
									<div className="lk-button-group-menu">
										<MediaDeviceMenu kind="audiooutput"></MediaDeviceMenu>
									</div>
								</section>
							</>
						)}
					</>
				)}
				{activeTab === 'effects' && (
					<>
						<h3>Audio</h3>
						<section>
							<label htmlFor="noise-filter"> Enhanced Noise Cancellation</label>
							<input
								type="checkbox"
								id="noise-filter"
								onChange={(ev) => setIsNoiseFilterEnabled(ev.target.checked)}
								checked={isNoiseFilterEnabled}
							></input>
						</section>
					</>
				)}
			</div>
			<div
				style={{
					position: 'absolute',
					right: 'var(--lk-grid-gap)',
					bottom: 'var(--lk-grid-gap)'
				}}
				className={`flex items-center w-full justify-between`}
			>
				<div className="flex flex-col items-start">
					<span className="text-gray-600 px-7 dark:text-gray-400">
						You can invite your colleagues to join the meeting by sharing this link.
					</span>
					<button
						className="flex items-center px-7 text-primary-light"
						onClick={() => {
							navigator.clipboard.writeText(getTeamLink());
							setCopied(true);
							setTimeout(() => {
								setCopied(false);
							}, 1000 * 10 /** 10 Seconds */);
						}}
					>
						{copied ? <IconsLoader className="animate-spine" /> : <IconsContentCopy />}
						{shortenLink(getTeamLink())}
					</button>
				</div>

				<Button
					className={`lk-button  !bg-primary`}
					onClick={() => layoutContext?.widget.dispatch?.({ msg: 'toggle_settings' })}
				>
					Close
				</Button>
			</div>
		</div>
	);
}
