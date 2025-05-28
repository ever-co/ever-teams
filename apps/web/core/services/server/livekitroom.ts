import { ILiveKitCredentials } from '@/core/types/interfaces/integrations/livekit-credentials';

export async function tokenLiveKitRoom({ roomName, username }: ILiveKitCredentials) {
	try {
		const response = await fetch(
			`/api/livekit?roomName=${roomName ?? 'default'}&username=${username ?? 'employee'}`
		);
		return await response.json();
	} catch (e) {
		console.error(e);
	}
}
