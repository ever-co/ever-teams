import { JITSI_DOMAIN } from '@app/constants';
import { useOrganizationTeams } from '@app/hooks';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRouter } from 'next/router';

export default function CallPage({ jwt }: { jwt: string }) {
	const { activeTeam } = useOrganizationTeams();
	const router = useRouter();

	const roomName = activeTeam?.name
		.toLowerCase()
		.replace(/(?<= )[^\s]|^./g, (a) => a.toUpperCase())
		.replaceAll(' ', '');

	return (
		<JitsiMeeting
			domain={JITSI_DOMAIN}
			roomName={'EverTeam' + roomName}
			configOverwrite={{
				startWithAudioMuted: true,
				startWithVideoMuted: true,
				disableModeratorIndicator: false,
				startScreenSharing: false,
				enableEmailInStats: false,
			}}
			interfaceConfigOverwrite={{
				DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
			}}
			jwt={jwt}
			onApiReady={(externalApi) => {
				externalApi.addListener('readyToClose', () => {
					router.push('/');
				});
				// here you can attach custom event listeners to the Jitsi Meet External API
				// you can also store it locally to execute commands
			}}
			getIFrameRef={(iframeRef) => {
				iframeRef.style.height = '100vh';
			}}
		/>
	);
}
