import { InviteUserTeamCard, UserTeamCard } from './user-team-card';

export function TeamMembers() {
	return (
		<ul className="mt-10">
			<li className="mb-4">
				<UserTeamCard active />
			</li>

			<li className="mb-4">
				<UserTeamCard
					userName="Arnold Kovacik"
					userEmail="Arnoldkov@gmail.com"
					timerStatus="pause"
					userImage="/assets/profiles/kevin.png"
				/>
			</li>

			<li className="mb-4">
				<UserTeamCard
					userName="Bedlam Ryu"
					userEmail="RyuBedlam@gmail.com"
					timerStatus="pause"
					userImage="/assets/profiles/roska.png"
				/>
			</li>

			<li className="mb-4">
				<UserTeamCard
					userName="Sukuna Akutawa"
					userEmail="SukunaAkut@gmail.com"
					timerStatus="idle"
					userImage="/assets/profiles/ruslan.png"
				/>
			</li>

			<li className="mb-4">
				<InviteUserTeamCard />
			</li>
		</ul>
	);
}
