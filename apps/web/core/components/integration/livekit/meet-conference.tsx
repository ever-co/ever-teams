'use client';

import * as React from 'react';
import {
	CarouselLayout,
	Chat,
	ConnectionStateToast,
	FocusLayout,
	FocusLayoutContainer,
	GridLayout,
	LayoutContextProvider,
	ParticipantTile,
	RoomAudioRenderer,
	formatChatMessageLinks,
	isTrackReference,
	useCreateLayoutContext,
	usePinnedTracks,
	useTracks,
	type TrackReferenceOrPlaceholder,
	type WidgetState
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { useMeetingReactions } from '@/core/hooks/meetings/use-meeting-reactions';
import { MeetControlBar } from './meet-control-bar';
import { MeetReactions } from './meet-reactions';
import { PeoplePanel } from './people-panel';
import { SettingsMenu } from './settings-livekit';

/** The same track of the same person: the identity of a tile, as LiveKit's layouts compare them. */
function isSameTrack(first: TrackReferenceOrPlaceholder | undefined, second: TrackReferenceOrPlaceholder | undefined) {
	if (!first || !second) {
		return false;
	}
	return (
		first.participant.identity === second.participant.identity &&
		first.source === second.source &&
		first.publication?.trackSid === second.publication?.trackSid
	);
}

/**
 * The meeting room's conference, made of LiveKit's parts as its `VideoConference` prefab is: everyone in a grid, a
 * shared screen in focus with the others beside it, the room's own control bar, the people, the chat, the settings, and
 * the reactions sent to everyone.
 */
export function MeetConference() {
	const [widgetState, setWidgetState] = React.useState<WidgetState>({
		showChat: false,
		unreadMessages: 0,
		showSettings: false
	});
	const [isPeopleOpen, setIsPeopleOpen] = React.useState(false);
	const reactions = useMeetingReactions();
	const lastAutoFocusedScreenShare = React.useRef<TrackReferenceOrPlaceholder | null>(null);
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false }
		],
		{ updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
	);
	const layoutContext = useCreateLayoutContext();
	const screenShareTracks = tracks
		.filter(isTrackReference)
		.filter((track) => track.publication.source === Track.Source.ScreenShare);
	const focusTrack = usePinnedTracks(layoutContext)?.[0];
	const carouselTracks = tracks.filter((track) => !isSameTrack(track, focusTrack));

	// A screen shared comes into focus by itself, and leaves it when the sharing stops, as in LiveKit's prefab. Running
	// again on every render changes nothing: each step acts once
	React.useEffect(() => {
		const sharedScreen = screenShareTracks.find((track) => track.publication.isSubscribed);
		if (sharedScreen && lastAutoFocusedScreenShare.current === null) {
			layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: sharedScreen });
			lastAutoFocusedScreenShare.current = sharedScreen;
		} else if (
			lastAutoFocusedScreenShare.current &&
			!screenShareTracks.some(
				(track) => track.publication.trackSid === lastAutoFocusedScreenShare.current?.publication?.trackSid
			)
		) {
			layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
			lastAutoFocusedScreenShare.current = null;
		}
		if (focusTrack && !isTrackReference(focusTrack)) {
			const updatedFocusTrack = tracks.find(
				(track) =>
					track.participant.identity === focusTrack.participant.identity && track.source === focusTrack.source
			);
			if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
				layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
			}
		}
	}, [screenShareTracks, focusTrack, tracks, layoutContext.pin]);

	return (
		<div className="lk-video-conference">
			<LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState}>
				<div className="lk-video-conference-inner relative">
					<MeetReactions reactions={reactions.shown} />
					{focusTrack ? (
						<div className="lk-focus-layout-wrapper">
							<FocusLayoutContainer>
								<CarouselLayout tracks={carouselTracks}>
									<ParticipantTile />
								</CarouselLayout>
								<FocusLayout trackRef={focusTrack} />
							</FocusLayoutContainer>
						</div>
					) : (
						<div className="lk-grid-layout-wrapper">
							<GridLayout tracks={tracks}>
								<ParticipantTile />
							</GridLayout>
						</div>
					)}
					<MeetControlBar
						isPeopleOpen={isPeopleOpen}
						onPeopleOpenChange={setIsPeopleOpen}
						onReact={(emoji) => void reactions.react(emoji)}
					/>
				</div>
				<Chat
					style={{ display: widgetState.showChat ? 'grid' : 'none' }}
					messageFormatter={formatChatMessageLinks}
				/>
				{isPeopleOpen && <PeoplePanel onClose={() => setIsPeopleOpen(false)} />}
				<div
					className="lk-settings-menu-modal"
					style={{ display: widgetState.showSettings ? 'block' : 'none' }}
				>
					<SettingsMenu />
				</div>
			</LayoutContextProvider>
			<RoomAudioRenderer />
			<ConnectionStateToast />
		</div>
	);
}
