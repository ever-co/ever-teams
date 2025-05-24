import { JwtPayload } from 'jsonwebtoken';
import { LocalAudioTrack, LocalVideoTrack } from 'livekit-client';

export interface ILiveKiteCredentials {
	ttl?: number | string;
	roomName?: string;
	identity?: string;
	username?: string;
	metadata?: string;
}

export interface CustomJwtPayload extends JwtPayload {
	exp?: number;
	iss?: string;
	nbf?: number;
	sub?: string;
	video?: {
		canPublish: boolean;
		canPublishData: boolean;
		canSubscribe: boolean;
		room: string;
		roomJoin: boolean;
	};
}

export interface SessionProps {
	roomName: string;
	identity: string;
	audioTrack?: LocalAudioTrack;
	videoTrack?: LocalVideoTrack;
	region?: string;
	turnServer?: RTCIceServer;
	forceRelay?: boolean;
}

export interface TokenResult {
	identity: string;
	accessToken: string;
}
