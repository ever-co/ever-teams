'use client';

import { useOrganizationTeams } from '@/core/hooks';
import { BackButton, Button, Modal, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';
import { organizationTeamsState } from '@/core/stores';
import { useAtomValue } from 'jotai';

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
	const t = useTranslations();

	const teams = useAtomValue(organizationTeamsState);
	const { createOTeamLoading, createOrganizationTeam } = useOrganizationTeams();
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
			createOTeamLoading || teams.some((t) => t.name?.trim().toLowerCase().includes(name.toLowerCase().trim()))
		);
	}, [createOTeamLoading, name, teams]);

	return (
		<Modal isOpen={open} closeModal={closeModal} alignCloseIcon>
			<form className="sm:w-[530px] w-[330px]" autoComplete="off" onSubmit={handleSubmit}>
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							{t('common.CREATE_TEAM')}
						</Text.Heading>

						<div className="mt-5 w-full">
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

						<div className="flex justify-between items-center mt-3 w-full">
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
				</EverCard>
			</form>
		</Modal>
	);
}
