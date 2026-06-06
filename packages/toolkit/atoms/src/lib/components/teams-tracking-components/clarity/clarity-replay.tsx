'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Data } from 'clarity-decode';
import { Visualizer } from 'clarity-visualize';

import { PauseIcon, PlayIcon, RotateCcw, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';

import { Button, cn, Input, ThemedButton } from '@ever-teams/toolkit-ui';
import { formatDuration, extractUserAgentFromPayload, isMobileDevice } from '../../../utils/tracking-utils';

type ClarityReplayProps = {
	decodedPayloads: Data.DecodedPayload[]; // Array of decoded payloads
	className?: string;
};

type PlaybackMode = 'include-idle' | 'skip-idle';

const ClarityReplay: React.FC<ClarityReplayProps> = ({ decodedPayloads, className }) => {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const visualizerRef = useRef<Visualizer | null>(null);
	const decodedPayloadsRef = useRef<Data.DecodedPayload[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [, setEvents] = useState<Data.DecodedEvent[]>([]);
	const eventsRef = useRef<Data.DecodedEvent[]>([]);
	const frameRef = useRef<number | null>(null);
	const [currentTime, setCurrentTime] = useState(0);

	// Playback mode state
	const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('include-idle');
	const [envelopeDuration, setEnvelopeDuration] = useState(0);
	const [eventBasedDuration, setEventBasedDuration] = useState(0);
	const [activeDuration, setActiveDuration] = useState(0);
	const [isTransitioning, setIsTransitioning] = useState(false);

	const wasPlayingRef = useRef(false);
	const [domReady, setDomReady] = useState(false);
	const [isCompleted, setIsCompleted] = useState(false);
	const [playbackSpeed, setPlaybackSpeed] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isMobile, setIsMobile] = useState(false);

	// Prepare and decode session data
	useEffect(() => {
		console.log('Decoded Payloads : ', decodedPayloads);
		if (!iframeRef.current) return;

		if (!visualizerRef.current) {
			visualizerRef.current = new Visualizer();
		}
		const visualizer = visualizerRef.current;

		// Extract user agent and detect mobile device
		const userAgent = extractUserAgentFromPayload(decodedPayloads);
		const detectedIsMobile = isMobileDevice(userAgent);
		setIsMobile(detectedIsMobile);

		console.log('Device Detection:', {
			userAgent,
			isMobile: detectedIsMobile,
			extractedFrom: 'payloads[0].dimension?.[0].data[0][0]',
			payloadStructure: decodedPayloads[0]?.dimension?.[0]?.data
				? 'Found dimension data'
				: 'No dimension data found'
		});

		// Decode all payloads and store
		decodedPayloadsRef.current = decodedPayloads;

		// Merge all for initial DOM and events
		const merged = visualizer.merge(decodedPayloads);
		setEvents([...(merged.events as Data.DecodedEvent[])]);
		eventsRef.current = [...(merged.events as Data.DecodedEvent[])];
		setCurrentTime(0);

		// Calculate envelope-based duration (sum of all payload envelope.duration values)
		const envelopeDur = decodedPayloads.reduce((sum, payload) => sum + (Number(payload.envelope.duration) || 0), 0);
		setEnvelopeDuration(envelopeDur);

		// Calculate event-based duration (time span from first to last event)
		const allEvents = merged.events as Data.DecodedEvent[];
		let eventBasedDur = 0;
		if (allEvents.length > 0) {
			const eventTimes = allEvents.map((e) => e.time).filter((t) => typeof t === 'number');
			if (eventTimes.length > 0) {
				const firstEventTime = Math.min(...eventTimes);
				const lastEventTime = Math.max(...eventTimes);
				eventBasedDur = lastEventTime - firstEventTime;
			}
		}
		setEventBasedDuration(eventBasedDur);

		// Set active duration based on current mode (default to include-idle)
		setActiveDuration(envelopeDur);

		// Debug: Log duration calculations
		console.log('Duration calculations:', {
			envelopeDuration: envelopeDur,
			eventBasedDuration: eventBasedDur,
			activeDuration: envelopeDur,
			eventCount: allEvents.length,
			playbackMode: 'include-idle' // Default mode
		});

		setIsCompleted(false);
		setIsLoading(false);

		// Setup iframe and render initial DOM
		const iframe = iframeRef.current;
		if (iframe) {
			iframe.onload = () => {
				visualizer.setup(iframe.contentWindow as Window, {
					version: 'dev',
					onresize: () => {},
					metadata: undefined,
					mobile: detectedIsMobile,
					vNext: true,
					locale: 'en-us',
					onclickMismatch: () => {}
				});
				visualizer.dom(merged.dom);
				setDomReady(true);

				setHasLoaded(true);
			};
			// Force reload iframe to trigger onload
			iframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
		}
	}, [decodedPayloads]);

	// Playback loop
	const replayLoop = useCallback(() => {
		if (!isPlaying || isTransitioning) return;
		const visualizer = visualizerRef.current;
		if (!visualizer || !domReady) return;

		const events = eventsRef.current;

		// Check if session has completed

		if (events.length === 0 || currentTime >= activeDuration) {
			// Session has finished - reset to completed state
			setIsPlaying(false);
			setIsCompleted(true);
			setCurrentTime(activeDuration);

			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
			return;
		}

		// Execute only if there are events to render
		if (events.length > 0) {
			let event = events[0];

			// Fixed speed calculation: Proper time scaling for playback speed
			// Standard frame time is 16ms (60fps), scale by playback speed
			const frameTime = 16; // Standard 60fps frame time
			const scaledFrameTime = frameTime * playbackSpeed; // Scale time advancement by speed
			let end = event.time + scaledFrameTime;

			let index = 0;
			const missingFields: string[] = [];
			while (event && event.time < end) {
				if (event.time === undefined) {
					missingFields.push(`event at index ${index} is missing 'time'`);
				}
				event = events[++index];
			}
			if (missingFields.length > 0) {
				console.error('Replay error: Missing required fields in events:', missingFields.join('; '));
			}
			const toRender = events.splice(0, index);
			if (toRender.length > 0) {
				const newTime = toRender[toRender.length - 1].time;
				setCurrentTime(newTime);

				// Check if we've reached the end

				if (newTime >= activeDuration) {
					setIsPlaying(false);
					setIsCompleted(true);
					setCurrentTime(activeDuration);

					if (frameRef.current) {
						cancelAnimationFrame(frameRef.current);
						frameRef.current = null;
					}
					return;
				}
			}
			visualizer.render(toRender);
		}
		frameRef.current = requestAnimationFrame(replayLoop);
	}, [isPlaying, domReady, activeDuration, playbackSpeed, isTransitioning, currentTime]);

	// Start/stop playback based on isPlaying
	useEffect(() => {
		if (isPlaying) {
			frameRef.current = requestAnimationFrame(replayLoop);
		} else if (frameRef.current) {
			cancelAnimationFrame(frameRef.current);
			frameRef.current = null;
		}
		return () => {
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
				frameRef.current = null;
			}
		};
	}, [isPlaying, replayLoop]);

	// Handle playback mode toggle with seamless transition
	const handlePlaybackModeToggle = () => {
		// Prevent multiple rapid toggles during transition
		if (isTransitioning) return;

		// Start transition animation
		setIsTransitioning(true);

		// Store current playback state
		const wasCurrentlyPlaying = isPlaying;

		// Toggle the mode
		const newMode: PlaybackMode = playbackMode === 'include-idle' ? 'skip-idle' : 'include-idle';

		// Calculate current position as percentage of old timeline
		const currentProgress = activeDuration > 0 ? currentTime / activeDuration : 0;

		// Update active duration based on new mode
		const newDuration = newMode === 'include-idle' ? envelopeDuration : eventBasedDuration;

		// Map current position to new timeline
		const newCurrentTime = currentProgress * newDuration;

		// For seamless transition, we need to update the events array to match the new timeline position
		if (wasCurrentlyPlaying && visualizerRef.current) {
			// Re-sync the events array for the new timeline position
			const decodedPayloads = decodedPayloadsRef.current;
			const merged = visualizerRef.current.merge(decodedPayloads);
			const allEvents = merged.events as Data.DecodedEvent[];

			// Find events that should have already played at the new timeline position
			const seekIndex = allEvents.findIndex((ev) => ev.time > newCurrentTime);
			eventsRef.current = allEvents.slice(seekIndex === -1 ? allEvents.length : seekIndex) as Data.DecodedEvent[];
		}

		// Apply changes with smooth transition
		setTimeout(() => {
			setPlaybackMode(newMode);
			setActiveDuration(newDuration);
			setCurrentTime(newCurrentTime);

			// End transition after a brief delay for smooth animation
			setTimeout(() => {
				setIsTransitioning(false);
			}, 150);
		}, 50);

		// Debug: Log the transition
		console.log('Mode transition:', {
			oldMode: playbackMode,
			newMode,
			oldDuration: activeDuration,
			newDuration,
			oldTime: currentTime,
			newTime: newCurrentTime,
			progress: currentProgress,
			wasPlaying: wasCurrentlyPlaying
		});
	};

	// Update active duration when mode changes
	useEffect(() => {
		const newDuration = playbackMode === 'include-idle' ? envelopeDuration : eventBasedDuration;
		setActiveDuration(newDuration);
	}, [playbackMode, envelopeDuration, eventBasedDuration]);

	// Seek to a specific time
	const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
		const seekTime = Number(e.target.value);
		setCurrentTime(seekTime);
		setIsPlaying(false);
		wasPlayingRef.current = isPlaying;

		// Merge all payloads for a fresh DOM and events
		const decodedPayloads = decodedPayloadsRef.current;
		const merged = visualizerRef.current!.merge(decodedPayloads);
		const allEvents = merged.events as Data.DecodedEvent[];
		const seekIndex = allEvents.findIndex((ev) => ev.time > seekTime);
		const eventsToRender = seekIndex === -1 ? allEvents : allEvents.slice(0, seekIndex);

		if (iframeRef.current && visualizerRef.current) {
			visualizerRef.current.dom(merged.dom);
			setDomReady(true);

			visualizerRef.current.render(eventsToRender);
		}
		eventsRef.current = allEvents.slice(seekIndex === -1 ? allEvents.length : seekIndex) as Data.DecodedEvent[];
	};

	// Resume playback if it was playing before seek
	useEffect(() => {
		if (!isPlaying && wasPlayingRef.current) {
			setIsPlaying(true);
			wasPlayingRef.current = false;
		}
	}, [currentTime]);

	// Play
	const handlePlay = () => {
		// If completed, restart from beginning
		if (isCompleted) {
			handleReplay();
		} else {
			setIsPlaying(true);
		}
	};

	// Pause
	const handlePause = () => {
		setIsPlaying(false);
	};

	// Replay (reset events and DOM, then play)
	const handleReplay = () => {
		setIsPlaying(false);
		setIsCompleted(false);
		setIsLoading(true);

		setTimeout(() => {
			const decodedPayloads = decodedPayloadsRef.current;
			const merged = visualizerRef.current!.merge(decodedPayloads);
			eventsRef.current = [...(merged.events as Data.DecodedEvent[])];
			if (iframeRef.current && visualizerRef.current) {
				visualizerRef.current.dom(merged.dom);
				setDomReady(true);
			}
			setCurrentTime(0);
			setIsLoading(false);
			setIsPlaying(true);
		}, 100);
	};

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only handle shortcuts when the component is focused or no input is focused
			if (document.activeElement?.tagName === 'INPUT') return;

			switch (e.code) {
				case 'Space':
					e.preventDefault();
					if (isPlaying) {
						handlePause();
					} else {
						handlePlay();
					}
					break;
				case 'ArrowLeft':
					e.preventDefault();
					const newTimeLeft = Math.max(0, currentTime - 10000); // Skip back 10 seconds
					handleSeek({ target: { value: newTimeLeft.toString() } } as React.ChangeEvent<HTMLInputElement>);
					break;
				case 'ArrowRight':
					e.preventDefault();

					const newTimeRight = Math.min(activeDuration, currentTime + 10000); // Skip forward 10 seconds

					handleSeek({ target: { value: newTimeRight.toString() } } as React.ChangeEvent<HTMLInputElement>);
					break;
				case 'KeyR':
					e.preventDefault();
					handleReplay();
					break;
				case 'KeyM':
					e.preventDefault();
					handleMuteToggle();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isPlaying, currentTime, activeDuration]);

	// Audio control functionality
	const controlIframeAudio = useCallback((mute: boolean) => {
		if (!iframeRef.current?.contentWindow) return;

		try {
			const iframeDoc = iframeRef.current.contentWindow.document;

			// Control all audio and video elements in the iframe
			const audioElements = iframeDoc.querySelectorAll('audio, video');
			audioElements.forEach((element) => {
				const mediaElement = element as HTMLAudioElement | HTMLVideoElement;
				mediaElement.muted = mute;
			});

			// Also control any Web Audio API contexts if they exist
			const audioContext =
				(iframeRef.current.contentWindow as any).AudioContext ||
				(iframeRef.current.contentWindow as any).webkitAudioContext;

			if (audioContext && (iframeRef.current.contentWindow as any).audioContextInstance) {
				const ctx = (iframeRef.current.contentWindow as any).audioContextInstance;
				if (mute && ctx.state === 'running') {
					ctx.suspend();
				} else if (!mute && ctx.state === 'suspended') {
					ctx.resume();
				}
			}
		} catch (error) {
			// Silently handle cross-origin or other access errors
			console.warn('Could not access iframe audio elements:', error);
		}
	}, []);

	// Additional handlers for standard video player features
	const handleMuteToggle = () => {
		const newMutedState = !isMuted;
		setIsMuted(newMutedState);
		controlIframeAudio(newMutedState);
	};

	// Apply mute state when iframe loads or when mute state changes
	useEffect(() => {
		if (hasLoaded && domReady) {
			controlIframeAudio(isMuted);
		}
	}, [hasLoaded, domReady, isMuted, controlIframeAudio]);

	// Monitor for dynamically added audio elements during replay
	useEffect(() => {
		if (!iframeRef.current?.contentWindow || !domReady) return;

		const iframeDoc = iframeRef.current.contentWindow.document;
		let observer: MutationObserver;

		try {
			// Create a mutation observer to watch for new audio/video elements
			observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === Node.ELEMENT_NODE) {
							const element = node as Element;
							// Check if the added element is audio/video or contains audio/video
							const audioElements = element.matches?.('audio, video')
								? [element]
								: Array.from(element.querySelectorAll?.('audio, video') || []);

							audioElements.forEach((audioElement) => {
								const mediaElement = audioElement as HTMLAudioElement | HTMLVideoElement;
								mediaElement.muted = isMuted;
							});
						}
					});
				});
			});

			// Start observing
			observer.observe(iframeDoc.body, {
				childList: true,
				subtree: true
			});
		} catch (error) {
			console.warn('Could not set up audio monitoring:', error);
		}

		return () => {
			observer?.disconnect();
		};
	}, [domReady, isMuted]);

	const handleSpeedChange = (speed: number) => {
		setPlaybackSpeed(speed);
	};

	const handleFullscreenToggle = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			setIsFullscreen(true);
		} else {
			document.exitFullscreen();
			setIsFullscreen(false);
		}
	};

	// Listen for fullscreen changes
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);

	return (
		<div
			className={cn(
				'rounded-lg w-full h-full flex flex-col justify-center items-center bg-gray-500 dark:bg-gray-800 overflow-hidden',
				isMobile && 'max-w-md mx-auto', // Center mobile sessions with max width
				className
			)}
		>
			<iframe
				ref={iframeRef}
				id="clarity-replay"
				title="Clarity Session Replay"
				scrolling="no"
				className={cn(
					'rounded-lg',
					isMobile
						? 'w-full max-w-sm h-full max-h-[667px] mx-auto' // Mobile viewport styling
						: 'w-full h-full' // Desktop viewport styling
				)}
				sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			/>
			{/* Status indicators */}
			{(isLoading || !hasLoaded || isTransitioning) && (
				<div className="text-xs text-gray-500 flex items-center gap-1">
					<Loader2 size={12} className="animate-spin" />
					{isTransitioning ? 'Switching mode...' : isLoading ? 'Loading...' : 'Initializing...'}
				</div>
			)}
			{/* Controls overlay */}
			<div className="w-full flex-col dark:bg-black/70 bg-white text-black dark:text-white px-6 py-4 flex gap-2 z-10">
				{/* Progress bar */}
				<div className="relative">
					<Input
						type="range"
						min={0}
						max={activeDuration}
						value={currentTime}
						onChange={handleSeek}
						className={cn(
							'w-full flex-1 h-2 accent-blue-900 bg-gradient-to-r from-blue-500 to-blue-300 rounded-lg outline-hidden disabled:opacity-50',
							'transition-all duration-300 ease-in-out',
							isTransitioning && 'opacity-75'
						)}
						disabled={!hasLoaded || activeDuration === 0 || isLoading || isTransitioning}
					/>
					{isCompleted && (
						<div className="absolute top-0 left-0 w-full h-2 bg-green-500 rounded-lg opacity-75" />
					)}
				</div>

				{/* Main controls row */}
				<div className="flex items-center justify-between gap-3 mt-1">
					<div className="flex gap-2 justify-center items-center">
						{/* Play/Pause Button */}
						<ThemedButton
							onClick={isPlaying ? handlePause : handlePlay}
							disabled={!hasLoaded || isLoading}
							className="p-3 text-white rounded-full transition-colors duration-200 focus:outline-hidden"
							title={isCompleted ? 'Restart' : isPlaying ? 'Pause (Space)' : 'Play (Space)'}
						>
							{isLoading ? (
								<Loader2 size={15} className="animate-spin" />
							) : isPlaying ? (
								<PauseIcon size={15} />
							) : (
								<PlayIcon size={15} />
							)}
						</ThemedButton>

						{/* Replay Button */}
						<Button
							onClick={handleReplay}
							disabled={!hasLoaded || isLoading}
							variant={'outline'}
							className="bg-transparent border-none rounded-full text-2xl p-3 transition hover:bg-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
							title="Restart (R)"
						>
							<RotateCcw size={20} />
						</Button>

						{/* Playback Speed */}
						<select
							value={playbackSpeed}
							onChange={(e) => handleSpeedChange(Number(e.target.value))}
							className="bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm [&>option]:bg-white dark:[&>option]:bg-gray-800"
							disabled={!hasLoaded || isLoading}
							title="Playback Speed"
						>
							<option value={0.25}>0.25x</option>
							<option value={0.5}>0.5x</option>
							<option value={0.75}>0.75x</option>
							<option value={1}>1x</option>
							<option value={1.25}>1.25x</option>
							<option value={1.5}>1.5x</option>
							<option value={2}>2x</option>
						</select>

						{/* Mute/Unmute Toggle */}
						<Button
							onClick={handleMuteToggle}
							variant={'outline'}
							className="bg-transparent border-none p-2 transition hover:bg-black/10"
							title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
							disabled={!hasLoaded}
						>
							{isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
						</Button>

						{/* Skip Idle Times Checkbox */}
						<div className="flex items-center gap-2 mr-2">
							<Input
								type="checkbox"
								id="skip-idle-times"
								checked={playbackMode === 'skip-idle'}
								onChange={() => handlePlaybackModeToggle()}
								disabled={!hasLoaded || isLoading || isTransitioning}
								className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
								aria-describedby="skip-idle-times-description"
							/>
							<label
								htmlFor="skip-idle-times"
								className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
							>
								Skip idle times
							</label>
							<span id="skip-idle-times-description" className="sr-only">
								When checked, idle periods during replay will be skipped for faster playback
							</span>
						</div>

						{/* Fullscreen Button */}
						<Button
							onClick={handleFullscreenToggle}
							variant={'outline'}
							className="bg-transparent border-none p-2 transition hover:bg-black/10"
							title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
							disabled={!hasLoaded}
						>
							{isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
						</Button>
					</div>

					{/* Time Display */}
					<div className="flex items-center gap-2">
						{isCompleted && <span className="text-xs text-green-500 font-medium">Completed</span>}
						{/* Device Type Indicator */}
						<span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
							{isMobile ? '📱 Mobile' : '🖥️ Desktop'}
						</span>
						<span
							className={cn(
								'min-w-[90px] text-sm text-shadow-xs transition-all duration-300',
								isTransitioning && 'opacity-75 scale-95'
							)}
						>
							{formatDuration(currentTime)} / {formatDuration(activeDuration)}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ClarityReplay;
