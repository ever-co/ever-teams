'use client';
import React from 'react';
import {
    LiveKitRoom,
    VideoConference,
    formatChatMessageLinks,
    LocalUserChoices,
} from '@livekit/components-react';
import { RoomConnectOptions } from 'livekit-client';
import "@livekit/components-styles";
import { SettingsMenu } from './settings-livekit';

type LiveKitPageProps = {
    userChoices: LocalUserChoices;
    roomName?: string;
    region?: string;
    token?: string;
    liveKitUrl?: string;
    onLeave?: () => void;
};

export default function LiveKitPage({
    userChoices,
    onLeave,
    token,
    liveKitUrl,
}: LiveKitPageProps) {

    const [error, setError] = React.useState<string>();
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!token || !liveKitUrl) {
            setError('LiveKitPage: token and liveKitUrl are required');
            return;
        }
        setError(undefined);
    }, [token, liveKitUrl]);


    React.useEffect(() => {
        let mounted = true;

        return () => {
            mounted = false;
            navigator.mediaDevices?.getUserMedia({ audio: true, video: true })
                .then(stream => {
                    if (!mounted) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                })
                .catch(() => console.error('Failed to cleanup media streams')); // Ignore errors during cleanup
        };
    }, []);

    const connectOptions = React.useMemo((): RoomConnectOptions => ({
        autoSubscribe: true,
    }), []);

    const LiveKitRoomComponent = LiveKitRoom as React.ElementType;

    if (error) {
        return (
            <div className="flex items-center justify-center h-[100dvh] text-red-500 dark:text-red-400 p-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 max-w-md">
                    {error}
                </div>
            </div>
        );
    }
    return (
        <LiveKitRoomComponent
            className='!bg-light--theme-dark dark:!bg-dark--theme-light'
            onError={(err: Error) => {
                console.error('LiveKit connection error:', err);
                const errorMessages = {
                    'Room is full': 'The video conference room is full',
                    'Permission denied': 'Permission denied. Please allow camera/microphone access',
                    'Connection failed': 'Failed to connect. Please check your internet connection',
                    'Invalid token': 'Authentication failed. Please try again',
                } as const;
                setError(errorMessages[err.message as keyof typeof errorMessages] ?? 'Failed to connect to video conference');
            }}
            onConnected={() => setIsLoading(false)}
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
                isolation: 'isolate',
            }}
            onDisconnected={onLeave}
        >
           {isLoading ? (
                <div className="flex items-center justify-center h-full text-primary dark:text-primary-light">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent dark:border-primary-light dark:border-t-transparent"></div>
                        <span>Loading video conference...</span>
                    </div>
                </div>
            ) : (
                <VideoConference
                    chatMessageFormatter={formatChatMessageLinks}
                    SettingsComponent={SettingsMenu}
                />
            )}
        </LiveKitRoomComponent>
    );
}
