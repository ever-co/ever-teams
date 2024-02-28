'use client';

import { useTeamInvitations } from '@app/hooks';
// import { useEmployee } from '@app/hooks/features/useEmployee';
// import { IInviteEmail } from '@app/interfaces';
import { isEmail } from 'class-validator';
import { BackButton, Button, Card, InputField, Modal, Text } from 'lib/components';
import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AxiosError } from 'axios';
// import { InviteEmailDropdown } from './invite-email-dropdown';

export function InviteFormModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const { inviteUser, inviteLoading } = useTeamInvitations();
	const [errors, setErrors] = useState<{
		email?: string;
		name?: string;
	}>({});
	const [inputData, setInputData] = useState({ email: '', name: '' });
	// const [selectedEmail, setSelectedEmail] = useState<IInviteEmail>();
	// const { workingEmployees } = useEmployee();
	// const [currentOrgEmails, setCurrentOrgEmails] = useState<IInviteEmail[]>([]);
	// const { activeTeam } = useOrganizationTeams();

	// useEffect(() => {
	// 	if (activeTeam?.members) {
	// 		const activeTeamMemberEmails = activeTeam?.members.map((member) => member.employee.user?.email);

	// 		setCurrentOrgEmails(
	// 			workingEmployees
	// 				.map((item) => ({
	// 					title: item.user?.email || '',
	// 					name: item.fullName || ''
	// 				}))
	// 				.filter((item) => !activeTeamMemberEmails.includes(item.title))
	// 		);
	// 	}
	// }, [workingEmployees, workingEmployees.length, activeTeam]);

	// const handleAddNew = (email: string) => {
	// 	const newItem = { title: email, name: '' };
	// 	setSelectedEmail(newItem);
	// 	setCurrentOrgEmails([...currentOrgEmails, newItem]);
	// };

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const form = new FormData(e.currentTarget);

			if (!inputData.email || (inputData.email && !isEmail(inputData.email))) {
				setErrors({
					email: t('errors.VALID_EMAIL')
				});
				return;
			}

			inviteUser(inputData.email, form.get('name')?.toString() || inputData.name || '')
				.then(() => {
					closeModal();

					e.currentTarget.reset();
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						setErrors((err.response?.data as any)?.errors || {});
					}
				});
		},
		[inputData, inviteUser, t, closeModal]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px] relative" autoComplete="off" onSubmit={handleSubmit}>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<div className="mb-7">
							<Text.Heading as="h3" className="mb-3 text-center">
								{t('pages.invite.HEADING_TITLE')}
							</Text.Heading>

							<Text className="text-sm text-center text-gray-500">
								{t('pages.invite.HEADING_DESCRIPTION')}
							</Text>
						</div>

						<div className="flex flex-col w-full gap-3">
							{/* <InviteEmailDropdown
								emails={currentOrgEmails}
								setSelectedEmail={setSelectedEmail}
								selectedEmail={selectedEmail}
								error={
									(isNotEmpty(errors) && Object.keys(errors).includes('email') && errors.email) || ''
								}
								handleAddNew={handleAddNew}

							/> */}

							<InputField
								type="email"
								name="email"
								placeholder={'Team member email address'}
								errors={errors}
								setErrors={setErrors}
								required
								defaultValue={inputData.email || ''}
								onChange={handleChange}
							/>

							<InputField
								type="text"
								name="name"
								placeholder={t('form.TEAM_MEMBER_NAME_PLACEHOLDER')}
								errors={errors}
								setErrors={setErrors}
								required
								defaultValue={inputData.name || ''}
								onChange={handleChange}
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-3">
							<BackButton onClick={closeModal} />

							<Button type="submit" disabled={inviteLoading} loading={inviteLoading}>
								{t('pages.invite.SEND_INVITE')}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
