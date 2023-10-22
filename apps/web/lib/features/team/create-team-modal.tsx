import { useOrganizationTeams } from '@app/hooks';
import { BackButton, Button, Card, InputField, Modal, Text } from 'lib/components';
import { useTranslation } from 'next-i18next';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';

/**
 * Create team modal
 */
export function CreateTeamModal({
	open,
	closeModal,
	joinTeamModal
}: {
	open: boolean;
	closeModal: () => void;
	joinTeamModal?: Dispatch<SetStateAction<boolean>>;
}) {
	const { t } = useTranslation();

	const { createOTeamLoading, createOrganizationTeam, teams } = useOrganizationTeams();
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
		return createOTeamLoading || teams.some((t) => t.name.trim().toLowerCase().includes(name.toLowerCase().trim()));
	}, [createOTeamLoading, name, teams]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<form className="sm:w-[530px] w-[330px]" autoComplete="off" onSubmit={handleSubmit}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="text-center">
							{t('common.CREATE_TEAM')}
						</Text.Heading>

						<div className="w-full mt-5">
							<InputField
								name="name"
								autoCustomFocus
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder={t('form.TEAM_NAME_PLACEHOLDER')}
								errors={error ? { name: error } : undefined}
								onKeyUp={() => setError(null)}
								required
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-3">
							{!joinTeamModal && <BackButton onClick={closeModal} />}

							{joinTeamModal && (
								<button
									type="button"
									className="text-xs font-normal text-gray-500 cursor-pointer dark:text-gray-400"
									onClick={() => {
										joinTeamModal(true);
									}}
								>
									<span className="text-primary dark:text-primary-light">
										{t('pages.auth.JOIN_TEAM')}
									</span>
								</button>
							)}

							<Button type="submit" disabled={disabled} loading={createOTeamLoading}>
								{t('common.CREATE')}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
