import { ILiveKitCredentials } from '@/core/types/interfaces/integrations/livekit-credentials';

export async function tokenLiveKitRoom({ roomName }: ILiveKitCredentials) {
	try {
		const response = await fetch(`/api/livekit?roomName=${roomName ?? 'default'}`);
		return await response.json();
	} catch (e) {
		console.error(e);
	}
}
