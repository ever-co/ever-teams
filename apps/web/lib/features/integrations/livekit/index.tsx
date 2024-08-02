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

type ActiveRoomProps = {
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
}: ActiveRoomProps) {
    const connectOptions = React.useMemo((): RoomConnectOptions => ({
        autoSubscribe: true,
    }), []);
    const LiveKitRoomComponent = LiveKitRoom as React.ElementType;
    return (
        <LiveKitRoomComponent
            className='!bg-light--theme-dark dark:!bg-dark--theme-light'
            connectOptions={connectOptions}
            audio={userChoices.audioEnabled}
            video={userChoices.videoEnabled}
            token={token}
            serverUrl={liveKitUrl}
            connect={true}
            data-lk-theme="default"
            style={{ height: '100dvh' }}
            onDisconnected={onLeave}
        >
            <VideoConference
                chatMessageFormatter={formatChatMessageLinks}
                SettingsComponent={SettingsMenu}
            />
        </LiveKitRoomComponent>
    );
}
