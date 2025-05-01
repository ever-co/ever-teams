import { ILiveKiteCredentials } from '@/core/types/interfaces';

export async function tokenLiveKitRoom({ roomName, username }: ILiveKiteCredentials) {
	try {
		const response = await fetch(
			`/api/livekit?roomName=${roomName ?? 'default'}&username=${username ?? 'employee'}`
		);
		return await response.json();
	} catch (e) {
		console.error(e);
	}
}
