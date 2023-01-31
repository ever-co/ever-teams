import { useOrganizationTeams } from '@app/hooks';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { useState } from 'react';

/**
 * Create team modal
 */
export function CreateTeamModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { createOTeamLoading, createOrganizationTeam } = useOrganizationTeams();
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const name = form.get('name') || '';

		createOrganizationTeam(name.toString())
			.then(closeModal)
			.catch((err) => {
				setError(err?.message);
			});
	};

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							Create new team
						</Text.Heading>

						<div className="w-full mt-5">
							<InputField
								name="name"
								autoCustomFocus
								placeholder="Please Enter your team name"
								errors={error ? { name: error } : undefined}
								onKeyUp={() => setError(null)}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={createOTeamLoading}
								loading={createOTeamLoading}
							>
								Create
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
