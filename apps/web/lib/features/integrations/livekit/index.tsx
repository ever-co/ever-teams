'use client';

import React from 'react';
import {
    LiveKitRoom,
    VideoConference,
    formatChatMessageLinks,
    LocalUserChoices,
} from '@livekit/components-react';
import { RoomConnectOptions } from 'livekit-client';
import '@livekit/components-styles';
import { SettingsMenu } from './settings-livekit';

/**
 * Props for the LiveKitPage component
 * @interface ActiveRoomProps
 * @property {LocalUserChoices} userChoices - User's audio/video preferences
 * @property {string} [roomName] - Optional name of the room to join
 * @property {string} [region] - Optional geographic region for the room
 * @property {string} [token] - Authentication token for LiveKit
 * @property {string} [liveKitUrl] - URL of the LiveKit server
 * @property {() => void} [onLeave] - Callback when user leaves the room
 */
interface ActiveRoomProps {
    userChoices: LocalUserChoices;
    roomName?: string;
    region?: string;
    token?: string;
    liveKitUrl?: string;
    onLeave?: () => void;
}

/**
 * Default connection options for LiveKit room
 * @constant defaultConnectOptions
 */
const defaultConnectOptions: RoomConnectOptions = {
    autoSubscribe: true,
    dynacast: true,
    stopMicTrackOnMute: true, // Better resource management
    publishDefaults: {
        simulcast: true, // Enable simulcast for better quality scaling
        dtx: true, // Discontinuous transmission for audio
    },
};

/**
 * LiveKitPage component for video conferencing
 * @component
 * @param {ActiveRoomProps} props - Component props
 * @returns {JSX.Element} LiveKit video conference room
 */
export default function LiveKitPage({
    userChoices,
    onLeave,
    token,
    liveKitUrl,
}: ActiveRoomProps): JSX.Element {
    // Validate required props
    if (!token || !liveKitUrl) {
        throw new Error('LiveKitPage: token and liveKitUrl are required');
    }

    // Memoize connection options to prevent unnecessary re-renders
    const connectOptions = React.useMemo(
        () => ({ ...defaultConnectOptions }),
        []
    );

    // Cast LiveKitRoom to ElementType to handle dynamic imports
    return (
        <LiveKitRoom
            className="!bg-light--theme-dark dark:!bg-dark--theme-light transition-colors"
            connectOptions={connectOptions}
            audio={userChoices.audioEnabled}
            video={userChoices.videoEnabled}
            token={token}
            serverUrl={liveKitUrl}
            connect={true}
            data-lk-theme="default"
            style={{
                height: '100dvh',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                isolation: 'isolate', // Create stacking context
            }}
            onDisconnected={onLeave}
        >
            <VideoConference
                chatMessageFormatter={formatChatMessageLinks}
                SettingsComponent={SettingsMenu}
            />
        </LiveKitRoom>
    );
}
