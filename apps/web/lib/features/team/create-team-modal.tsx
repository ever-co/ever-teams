import { useOrganizationTeams } from '@app/hooks';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useMemo, useState } from 'react';

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
	const { trans } = useTranslation();

	const { createOTeamLoading, createOrganizationTeam, teams } =
		useOrganizationTeams();
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState('');

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const name = form.get('name') || '';

		createOrganizationTeam(name.toString().trim())
			.then(closeModal)
			.catch((err) => {
				setError(err?.message);
			});
	};

	const disabled = useMemo(() => {
		return (
			createOTeamLoading ||
			teams.some((t) =>
				t.name.trim().toLowerCase().includes(name.toLowerCase().trim())
			)
		);
	}, [createOTeamLoading, name, teams]);

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
							{trans.common.CREATE_TEAM}
						</Text.Heading>

						<div className="w-full mt-5">
							<InputField
								name="name"
								autoCustomFocus
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={trans.form.TEAM_NAME_PLACEHOLDER}
								errors={error ? { name: error } : undefined}
								onKeyUp={() => setError(null)}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={disabled}
								loading={createOTeamLoading}
							>
								{trans.common.CREATE}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
