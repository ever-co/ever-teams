'use client';

import { IInviteEmail } from '@/core/types/interfaces';
import { AxiosError } from 'axios';
import { isEmail, isNotEmpty } from 'class-validator';
import { BackButton, Button, Card, InputField, Modal, Text } from '@/core/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { InviteEmailDropdown } from './invite-email-dropdown';
import { useToast } from '@/core/components/ui/use-toast';
import { useEmployee, useOrganizationTeams, useTeamInvitations } from '@/core/hooks/organizations';

export function InviteFormModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const { inviteUser, inviteLoading, teamInvitations, resendTeamInvitation, resendInviteLoading } =
		useTeamInvitations();

	const [errors, setErrors] = useState<{
		email?: string;
		name?: string;
	}>({});

	const [selectedEmail, setSelectedEmail] = useState<IInviteEmail>();
	const { workingEmployees } = useEmployee();
	const [currentOrgEmails, setCurrentOrgEmails] = useState<IInviteEmail[]>([]);
	const { activeTeam } = useOrganizationTeams();
	const nameInputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToast();

	const isLoading = inviteLoading || resendInviteLoading;

	useEffect(() => {
		if (activeTeam?.members) {
			const activeTeamMemberEmails = activeTeam?.members.map((member) => member.employee.user?.email);

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
		if (!email.includes('@')) {
			email = `${email}@gmail.com`;
		}

		const newItem = { title: email, name: '' };
		setSelectedEmail(newItem);

		setCurrentOrgEmails([...currentOrgEmails, newItem]);
		const extractedName = email.split('@')[0];
		if (nameInputRef.current) {
			nameInputRef.current.value = extractedName;
			nameInputRef.current.focus();
			nameInputRef.current.select();
		}
	};

	const handleSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const form = new FormData(e.currentTarget);

			if (!selectedEmail?.title || (selectedEmail?.title && !isEmail(selectedEmail.title))) {
				setErrors({
					email: t('errors.VALID_EMAIL')
				});
				return;
			}

			const existingInvitation = teamInvitations.find((invitation) => invitation.email === selectedEmail.title);

			if (existingInvitation) {
				resendTeamInvitation(existingInvitation.id).then(() => {
					closeModal();

					toast({
						variant: 'default',
						title: t('common.INVITATION_SENT'),
						description: t('common.INVITATION_SENT_TO_USER', { email: selectedEmail.title }),
						duration: 5 * 1000
					});
				});
				return;
			}

			inviteUser(selectedEmail.title, form.get('name')?.toString() || selectedEmail.name || '')
				.then(() => {
					closeModal();
					e.currentTarget.reset();

					toast({
						variant: 'default',
						title: t('common.INVITATION_SENT'),
						description: t('common.INVITATION_SENT_TO_USER', { email: selectedEmail.title }),
						duration: 5 * 1000
					});
				})
				.catch((err: AxiosError) => {
					if (err.response?.status === 400) {
						const data = err.response?.data as any;

						if ('errors' in data) {
							setErrors(data.errors || {});
						}

						if ('message' in data && Array.isArray(data.message)) {
							setErrors({ email: data.message[0] });
						}
					}
				});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[selectedEmail, setErrors, closeModal, inviteUser]
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
							<InviteEmailDropdown
								emails={currentOrgEmails}
								setSelectedEmail={setSelectedEmail}
								selectedEmail={selectedEmail}
								error={
									(isNotEmpty(errors) && Object.keys(errors).includes('email') && errors.email) || ''
								}
								handleAddNew={handleAddNew}
							/>

							<InputField
								ref={nameInputRef}
								type="text"
								name="name"
								placeholder={t('form.TEAM_MEMBER_NAME_PLACEHOLDER')}
								errors={errors}
								setErrors={setErrors}
								required
								defaultValue={selectedEmail?.name || ''}
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-3">
							<BackButton onClick={closeModal} />

							<Button type="submit" disabled={isLoading} loading={isLoading}>
								{t('pages.invite.SEND_INVITE')}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
