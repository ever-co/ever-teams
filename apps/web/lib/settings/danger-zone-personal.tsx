/* eslint-disable no-mixed-spaces-and-tabs */
import { useUser } from '@app/hooks';
import { Button, Text } from 'lib/components';

export const DangerZone = () => {
	const { deleteUser, deleteUserLoading, resetUser, resetUserLoading } =
		useUser();
	return (
		<>
			<div className="flex flex-col justify-between items-center">
				<div className="w-full mt-5">
					<div className="">
						<div className="flex w-full items-center justify-between gap-6">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Remove Account</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Account will be removed from all teams, except where you are
									only the manager
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									disabled={resetUserLoading}
									loading={resetUserLoading}
									onClick={() => {
										// resetUser(); // TODO once API ready
									}}
								>
									Remove Everywhere
								</Button>
							</div>
						</div>
						<div className="flex w-full items-center justify-between gap-6 mt-5">
							<div className="flex-auto w-64">
								<Text className="text-xl  font-normal">Delete Account</Text>
							</div>
							<div className="flex-auto w-64">
								<Text className="text-md text-gray-400 font-normal">
									Your Account will be deleted permanently with removing from
									all teams
								</Text>
							</div>
							<div className="flex-auto w-32">
								<Button
									variant="danger"
									type="submit"
									className="float-right w-full bg-[#DE5536]"
									disabled={deleteUserLoading}
									loading={deleteUserLoading}
									onClick={() => {
										deleteUser();
									}}
								>
									Delete This Account
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
