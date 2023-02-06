/* eslint-disable no-mixed-spaces-and-tabs */
import { withAuthentication } from 'lib/app/authenticator';
import { Button, Text } from 'lib/components';

const DangerZoneTeam = () => {
	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
						<div className="flex w-full items-center justify-between gap-6">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Transfer Ownership</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Transfer full ownership of team to another user
								</Text>
							</div>
							<div className="flex-auto w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
								>
									Transfer
								</Button>
							</div>
						</div>

						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Remove Team</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Team will be completely removed for the system and team
									members lost access
								</Text>
							</div>
							<div className="flex-auto w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
								>
									Dispose Team
								</Button>
							</div>
						</div>

						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Quit the Team</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									You are about to quit the team
								</Text>
							</div>
							<div className="flex-auto w-10">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
								>
									Quit
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
export default withAuthentication(DangerZoneTeam, {
	displayName: 'DangerZoneTeam',
});
