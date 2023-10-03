import { MEET_DOMAIN } from '@app/constants';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useRouter } from 'next/router';

export default function MeetPage({
	jwt,
	roomName
}: {
	jwt: string;
	roomName: string;
}) {
	const router = useRouter();

	return (
		<JitsiMeeting
			domain={MEET_DOMAIN}
			roomName={roomName}
			configOverwrite={{
				startWithAudioMuted: true,
				startWithVideoMuted: true,
				disableModeratorIndicator: false,
				startScreenSharing: false,
				enableEmailInStats: false
			}}
			interfaceConfigOverwrite={{
				DISABLE_JOIN_LEAVE_NOTIFICATIONS: false
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
