import { useOrganizationTeams, useTeamInvitations } from '@app/hooks';
import { useEmployee } from '@app/hooks/features/useEmployee';
import { IInviteEmail } from '@app/interfaces';
import { AxiosError } from 'axios';
import { isEmail, isNotEmpty } from 'class-validator';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { InviteEmailDropdown } from './invite-email-dropdown';

export function InviteFormModal({
	open,
	closeModal
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { trans, translations } = useTranslation('invite');
	const { inviteUser, inviteLoading } = useTeamInvitations();
	const [errors, setErrors] = useState<{
		email?: string;
		name?: string;
	}>({});
	const [selectedEmail, setSelectedEmail] = useState<IInviteEmail>();
	const { workingEmployees } = useEmployee();
	const [currentOrgEmails, setCurrentOrgEmails] = useState<IInviteEmail[]>([]);
	const { activeTeam } = useOrganizationTeams();

	useEffect(() => {
		if (activeTeam?.members) {
			const activeTeamMemberEmails = activeTeam?.members.map(
				(member) => member.employee.user?.email
			);

			setCurrentOrgEmails(
				workingEmployees
					.map((item) => ({
						title: item.user?.email || '',
						name: item.fullName || ''
					}))
					.filter((item) => !activeTeamMemberEmails.includes(item.title))
			);
		}
	}, [workingEmployees, workingEmployees.length, activeTeam]);

	const handleAddNew = (email: string) => {
		const newItem = { title: email, name: '' };
		setSelectedEmail(newItem);
		setCurrentOrgEmails([...currentOrgEmails, newItem]);
	};

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const form = new FormData(e.currentTarget);

			if (
				!selectedEmail?.title ||
				(selectedEmail?.title && !isEmail(selectedEmail.title))
			) {
				setErrors({
					email: 'Please enter valid email'
				});
				return;
			}

			inviteUser(
				selectedEmail.title,
				form.get('name')?.toString() || selectedEmail.name || ''
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
		},
		[selectedEmail, setErrors, closeModal, inviteUser]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[530px] relative"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<div className="mb-7">
							<Text.Heading as="h3" className="text-center mb-3">
								{trans.HEADING_TITLE}
							</Text.Heading>

							<Text className="text-center text-gray-500 text-sm">
								{trans.HEADING_DESCRIPTION}
							</Text>
						</div>

						<div className="w-full flex flex-col gap-3">
							<InviteEmailDropdown
								emails={currentOrgEmails}
								setSelectedEmail={setSelectedEmail}
								selectedEmail={selectedEmail}
								error={
									(isNotEmpty(errors) &&
										Object.keys(errors).includes('email') &&
										errors.email) ||
									''
								}
								handleAddNew={handleAddNew}
							/>

							<InputField
								type="text"
								name="name"
								placeholder={translations.form.TEAM_MEMBER_NAME_PLACEHOLDER}
								errors={errors}
								setErrors={setErrors}
								required
								defaultValue={selectedEmail?.name || ''}
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={inviteLoading}
								loading={inviteLoading}
							>
								{trans.SEND_INVITE}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
