import { useAuthenticateUser, useOrganizationTeams } from '@app/hooks';
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function CallPage() {
	const { activeTeam } = useOrganizationTeams();
	const { user } = useAuthenticateUser();

	const roomName = activeTeam?.name
		.toLowerCase()
		.replace(/(?<= )[^\s]|^./g, (a) => a.toUpperCase())
		.replaceAll(' ', '');

	return (
		<JitsiMeeting
			domain={process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si'}
			roomName={'EverTeam' + roomName}
			configOverwrite={{
				startWithAudioMuted: true,
				disableModeratorIndicator: true,
				startScreenSharing: true,
				enableEmailInStats: false,
				// autojoin: true,
			}}
			interfaceConfigOverwrite={{
				DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
			}}
			userInfo={{
				displayName: user?.name || '',
				email: user?.email || '',
			}}
			onApiReady={(externalApi) => {
				// here you can attach custom event listeners to the Jitsi Meet External API
				// you can also store it locally to execute commands
			}}
			getIFrameRef={(iframeRef) => {
				iframeRef.style.height = '100vh';
			}}
		/>
	);
}
