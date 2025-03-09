'use client';

import React from 'react';
import {
    LiveKitRoom,
    VideoConference,
    formatChatMessageLinks,
    LocalUserChoices,
} from '@livekit/components-react';
import { RoomConnectOptions, Room, RoomOptions } from 'livekit-client';
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
 * @constant connectOptions
 * @description Keeping only essential options that are confirmed to work with the current version
 */
const connectOptions = {
    autoSubscribe: true,
} satisfies RoomConnectOptions;

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
    roomName = 'default-room', // Provide default room name
}: ActiveRoomProps): JSX.Element {
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string>();
    // Validate required props
    React.useEffect(() => {
        if (!token || !liveKitUrl) {
            setError('LiveKitPage: token and liveKitUrl are required');
            return;
        }
        setError(undefined);
    }, [token, liveKitUrl]);

    // Handle cleanup of media streams when component unmounts
    React.useEffect(() => {
        let mounted = true;

        return () => {
            mounted = false;
            // Cleanup any active media streams
            navigator.mediaDevices?.getUserMedia({ audio: true, video: true })
                .then(stream => {
                    if (!mounted) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                })
                .catch(() => console.error('Failed to cleanup media streams')); // Ignore errors during cleanup
        };
    }, []);
    if (error) {
        return (
            <div className="flex items-center justify-center h-[100dvh] text-red-500">
                {error}
            </div>
        );
    }

    return (
        <LiveKitRoom
            className="!bg-light--theme-dark dark:!bg-dark--theme-light transition-colors duration-200"
            onConnected={() => setIsLoading(false)}
            onError={(err: any) => {
                console.error('LiveKit connection error:', err);
                const errorMessages = {
                    'Room is full': 'The video conference room is full',
                    'Permission denied': 'Permission denied. Please allow camera/microphone access',
                    'Connection failed': 'Failed to connect. Please check your internet connection',
                    'Invalid token': 'Authentication failed. Please try again',
                } as const;
                setError(errorMessages[err.message as keyof typeof errorMessages] ?? 'Failed to connect to video conference');
            }}
            connectOptions={connectOptions}
            audio={userChoices.audioEnabled}
            video={userChoices.videoEnabled}
            token={token}
            serverUrl={liveKitUrl}
            name={roomName}
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
            {isLoading ? (
                <div className="flex items-center justify-center h-full text-primary dark:text-primary-light">
                    Loading video conference...
                </div>
            ) : (
                <VideoConference
                    chatMessageFormatter={formatChatMessageLinks}
                    SettingsComponent={SettingsMenu}
                />
            )}
        </LiveKitRoom>
    );
}
