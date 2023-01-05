import { Container, Card, Text, InputField, Button } from 'lib/components';
import Footer from 'lib/layout/footer';

export default function AuthTeam() {
	return (
		<Container>
			<div className="flex flex-col items-center h-screen min-h-[500px] justify-between w-full">
				<div className="w-11/12 md:w-1/2 mt-20 md:mt-40 flex flex-col items-center">
					<Text.H1 className="mb-3 text-center">Create New Team</Text.H1>

					<Text className="text-sm md:text-lg text-gray-400 text-center mb-[56px]">
						Please enter your team details to create a new team.
					</Text>

					<Card className="w-[98%] md:w-[550px] h-64" shadow="bigger">
						<CreateTeamForm />
					</Card>
				</div>
				<Footer />
			</div>
		</Container>
	);
}

function CreateTeamForm() {
	return (
		<div className="flex flex-col justify-between items-center h-full">
			<Text.H3 className="text-center">Input your team name</Text.H3>

			<InputField placeholder="Please Enter your team name" />

			<div className="flex justify-between w-full items-center">
				<Text.Link
					href="/auth/passcode"
					underline
					variant="primary"
					className="text-xs dark:text-gray-400"
				>
					Joining existing team?
				</Text.Link>

				<Button>Continue</Button>
			</div>
		</div>
	);
}
