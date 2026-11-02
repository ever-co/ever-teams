'use client';

import { useCreateOrganizationTeam } from '@/core/hooks';
import {
	Button,
	Modal,
	Text,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass,
	modalTitleFieldClass
} from '@/core/components';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { organizationTeamsState, timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

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
	const { data: user } = useUserQuery();
	const workspaceName: string | undefined = user?.tenant?.name;

	const timerStatus = useAtomValue(timerStatusState);
	const timerRunningStatus = useMemo(() => {
		return Boolean(timerStatus?.running);
	}, [timerStatus]);
	const teams = useAtomValue(organizationTeamsState);
	const { loading: createOTeamLoading, createOrganizationTeam } = useCreateOrganizationTeam();
	const [error, setError] = useState<string | null>(null);

	const [name, setName] = useState('');

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		console.log('Team Submit');
		e.preventDefault();
		setError(null);
		const form = new FormData(e.currentTarget);
		const name = form.get('name') || '';

		createOrganizationTeam(name.toString().trim())
			.then(closeModal)
			.catch((err) => {
				// Prefer the API's own message over axios' generic "Request failed with status code 400".
				setError(err?.response?.data?.message || err?.message);
			});
	};

	const disabled = useMemo(() => {
		return (
			createOTeamLoading || teams.some((t) => t.name?.trim().toLowerCase().includes(name.toLowerCase().trim()))
		);
	}, [createOTeamLoading, name, teams]);

	const hasNameError = Boolean(error);

	return (
		<Modal
			isOpen={open}
			closeModal={closeModal}
			alignCloseIcon
			title={t('common.CREATE_TEAM')}
			breadcrumb={workspaceName}
		>
			<form className="flex w-full flex-col gap-5 sm:w-md" autoComplete="off" onSubmit={handleSubmit}>
				<div className="flex flex-col gap-1.5">
					<input
						type="text"
						name="name"
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={t('form.TEAM_NAME_PLACEHOLDER')}
						aria-label={t('form.TEAM_NAME_PLACEHOLDER')}
						aria-invalid={hasNameError}
						onKeyUp={() => setError(null)}
						className={modalTitleFieldClass}
						required
					/>
					{hasNameError && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
				</div>

				<div className="flex w-full items-center justify-between gap-3">
					{joinTeamModal && (
						<button
							type="button"
							className="cursor-pointer text-[13px] font-normal text-primary-ink"
							onClick={() => {
								joinTeamModal(true);
							}}
						>
							{t('pages.auth.JOIN_TEAM')}
						</button>
					)}

					<div className={`${modalFooterClass} ml-auto pt-0`}>
						{!joinTeamModal && (
							<Button
								type="button"
								variant="ghost"
								size="default"
								className={modalSecondaryActionClass}
								onClick={closeModal}
							>
								{t('common.CANCEL')}
							</Button>
						)}
						<Button
							type="submit"
							size="default"
							className={modalPrimaryActionClass}
							disabled={disabled || timerRunningStatus}
							loading={createOTeamLoading}
						>
							{t('common.CREATE')}
						</Button>
					</div>
				</div>
			</form>
		</Modal>
	);
}
