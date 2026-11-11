import { ILiveKitCredentials } from '@/core/types/interfaces/integrations/livekit-credentials';

/** The LiveKit token of a room; rejects with the answer's `status` when the app refuses or fails to issue it. */
export async function tokenLiveKitRoom({ roomName }: ILiveKitCredentials): Promise<{ token?: string }> {
	const query = new URLSearchParams({ roomName: roomName ?? 'default' });
	const response = await fetch(`/api/livekit?${query.toString()}`);
	if (!response.ok) {
		throw Object.assign(new Error(`The LiveKit token request failed (${response.status})`), {
			status: response.status
		});
	}
	return response.json();
}
