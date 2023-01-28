import { useTeamInvitations } from '@app/hooks';
import { AxiosError } from 'axios';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { useState } from 'react';

export function InviteFormModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { invateUser, inviteLoading } = useTeamInvitations();
	const [errors, setErrors] = useState({});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const form = new FormData(e.currentTarget);

		invateUser(
			form.get('email')?.toString() || '',
			form.get('name')?.toString() || ''
		)
			.then(() => {
				closeModal();

				e.currentTarget.reset();
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	};

	return (
		<Modal isOpen={open} closeModal={() => undefined}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<div className="mb-7">
							<Text.Heading as="h3" className="text-center mb-3">
								Invite member to your team
							</Text.Heading>

							<Text className="text-center text-gray-500 text-sm">
								Send invitation to a team member by email
							</Text>
						</div>

						<div className="w-full">
							<InputField
								type="email"
								name="email"
								placeholder="Team member email address"
								errors={errors}
								setErrors={setErrors}
								required
							/>
						</div>

						<div className="w-full mt-1">
							<InputField
								type="text"
								name="name"
								placeholder="Team member name"
								errors={errors}
								setErrors={setErrors}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={inviteLoading}
								loading={inviteLoading}
							>
								Send Invitation
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
