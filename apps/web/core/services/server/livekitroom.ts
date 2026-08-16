import { ILiveKitCredentials } from '@/core/types/interfaces/integrations/livekit-credentials';

export async function tokenLiveKitRoom({ roomName }: ILiveKitCredentials) {
	try {
		const query = new URLSearchParams({ roomName: roomName ?? 'default' });
		const response = await fetch(`/api/livekit?${query.toString()}`);
		return await response.json();
	} catch (e) {
		console.error(e);
	}
}
