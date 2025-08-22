'use client';

import { AxiosError } from 'axios';
import { isEmail, isNotEmpty } from 'class-validator';
import { BackButton, Button, Modal, Text } from '@/core/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { InviteEmailDropdown } from '../../teams/invite/invite-email-dropdown';
import { useTeamInvitations } from '@/core/hooks/organizations';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '../../duplicated-components/_input';
import { IInviteEmail } from '../../teams/invite/invite-email-item';
import { toast } from 'sonner';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '../../common/select';
import { useAtomValue } from 'jotai';
import { activeTeamState, getTeamInvitationsState, rolesState, workingEmployeesState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export function InviteFormModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const { data: user } = useUserQuery();
	const roles = useAtomValue(rolesState);
	const t = useTranslations();

	const teamInvitations = useAtomValue(getTeamInvitationsState);
	const { inviteUser, inviteLoading, resendTeamInvitation, resendInviteLoading } = useTeamInvitations();

	const [errors, setErrors] = useState<{ email?: string; name?: string; role?: string }>({});
	const [selectedEmail, setSelectedEmail] = useState<IInviteEmail>();
	const workingEmployees = useAtomValue(workingEmployeesState);
	const [currentOrgEmails, setCurrentOrgEmails] = useState<IInviteEmail[]>([]);
	const activeTeam = useAtomValue(activeTeamState);
	const nameInputRef = useRef<HTMLInputElement>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isLoading = inviteLoading || resendInviteLoading;
	const defaultSelectedRole = useMemo(() => roles.find((role) => role.name === ERoleName.EMPLOYEE), [roles]);
	const [selectedRoleId, setSelectedRoleId] = useState(() => defaultSelectedRole?.id);
	const isAdmin = user?.role?.name && [ERoleName.ADMIN, ERoleName.SUPER_ADMIN].includes(user?.role.name as ERoleName);
	const allowedRoles = new Set([ERoleName.ADMIN, ERoleName.EMPLOYEE, ERoleName.MANAGER]);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (activeTeam?.members) {
			const activeTeamMemberEmails = activeTeam?.members.map((m) => m.employee?.user?.email);
			setCurrentOrgEmails(
				workingEmployees
					.map((emp) => ({
						title: emp.user?.email || '',
						name: emp.fullName || ''
					}))
					.filter((entry) => !activeTeamMemberEmails.includes(entry.title))
			);
		}
	}, [workingEmployees, activeTeam]);

	const handleAddNew = (email: string) => {
		if (!email.includes('@')) email = `${email}@gmail.com`;

		const newItem = { title: email, name: '' };
		setSelectedEmail(newItem);
		setCurrentOrgEmails((prev) => [...prev, newItem]);

		const extractedName = email.split('@')[0];
		if (nameInputRef.current) {
			nameInputRef.current.value = extractedName;
			nameInputRef.current.focus();
			nameInputRef.current.select();
		}
	};

	const showSuccessToast = (email: string) => {
		toast.success(t('common.INVITATION_SENT'), {
			id: 'invite-form-modal-success',
			description: t('common.INVITATION_SENT_TO_USER', { email }),
			duration: 5000
		});
	};

	const showErrorToast = () => {
		toast.error(t('errors.VALID_EMAIL'), {
			id: 'invite-form-modal-error',
			duration: 5000
		});
	};

	const handleResend = async (invitationId: string | null | undefined, email: string) => {
		if (!invitationId) return;

		await resendTeamInvitation(invitationId);
		showSuccessToast(email);
	};

	const handleInvite = async (email: string, name: string, form: HTMLFormElement, roleId?: string) => {
		await inviteUser(email, name, roleId);

		form.reset();
		showSuccessToast(email);
	};

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			const form = new FormData(e.currentTarget);

			const email = selectedEmail?.title?.trim() || '';
			const name = form.get('name')?.toString() || selectedEmail?.name || '';

			if (!isEmail(email)) {
				setErrors({ email: t('errors.VALID_EMAIL') });
				return;
			}

			try {
				const existingInvitation = teamInvitations.find((inv) => inv.email === email);

				if (existingInvitation) {
					await handleResend(existingInvitation.id, email);
				} else {
					await handleInvite(email, name, e.currentTarget, selectedRoleId);
				}

				timeoutRef.current = setTimeout(() => closeModal(), 1000);
			} catch (err) {
				const error = err as AxiosError;

				if (error.response?.status === 400) {
					const data = error.response.data as any;

					if ('errors' in data) setErrors(data.errors || {});
					if (Array.isArray(data.message)) setErrors({ email: data.message[0] });

					showErrorToast();
				}
			}
		},
		[selectedEmail, teamInvitations, closeModal, t, inviteUser, resendTeamInvitation]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px] relative" autoComplete="off" onSubmit={handleSubmit}>
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<div className="mb-7">
							<Text.Heading as="h3" className="mb-3 text-center">
								{t('pages.invite.HEADING_TITLE')}
							</Text.Heading>

							<Text className="text-sm text-center text-gray-500">
								{t('pages.invite.HEADING_DESCRIPTION')}
							</Text>
						</div>

						<div className="flex flex-col gap-3 w-full">
							<InviteEmailDropdown
								emails={currentOrgEmails}
								setSelectedEmail={setSelectedEmail}
								selectedEmail={selectedEmail}
								error={isNotEmpty(errors) && errors.email ? errors.email : ''}
								handleAddNew={handleAddNew}
							/>

							<InputField
								ref={nameInputRef}
								type="text"
								name="name"
								placeholder={t('form.TEAM_MEMBER_NAME_PLACEHOLDER')}
								errors={errors}
								className="h-[3rem]"
								setErrors={setErrors}
								noWrapper
								required
								defaultValue={selectedEmail?.name || ''}
							/>

							{isAdmin ? (
								<Select
									defaultValue={selectedRoleId}
									value={selectedRoleId}
									onValueChange={(value) => setSelectedRoleId(value)}
								>
									<SelectTrigger className="w-full input-border h-[3rem] data-[placeholder]:text-gray-400 data-[placeholder]:dark::text-[#3b3c44]  bg-white rounded-lg border-gray-300 text-ellipsis dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
										<SelectValue placeholder={t('form.TEAM_MEMBER_ROLE')} />
									</SelectTrigger>
									<SelectContent className="z-[1001] max-h-60 overflow-y-auto">
										<SelectGroup>
											{roles
												.filter((role) => allowedRoles.has(role.name as ERoleName))
												.map((role) => (
													<SelectItem
														key={role.id}
														value={role.id}
														className="hover:bg-primary focus:bg-primary focus:text-white hover:!text-white  py-1 cursor-pointer"
													>
														{role.name}
													</SelectItem>
												))}
										</SelectGroup>
									</SelectContent>
								</Select>
							) : null}
						</div>

						<div className="flex justify-between items-center mt-6 w-full">
							<BackButton onClick={closeModal} />
							<Button type="submit" disabled={isLoading} loading={isLoading}>
								{t('pages.invite.SEND_INVITE')}
							</Button>
						</div>
					</div>
				</EverCard>
			</form>
		</Modal>
	);
}
