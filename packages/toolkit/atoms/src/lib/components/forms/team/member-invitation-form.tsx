'use client';

import { cn, InputField, Dialog, ThemedButton } from '@ever-teams/toolkit-ui';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { useMemberInvitationForm } from '@hooks/useMemberInvitationForm';
import { useTeamsContext } from '@lib/context/teams-context';
import { Loader2, Plus, Send } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const TeamsMemberInvitationForm = ({ className }: { className?: string }) => {
	const { selectedTeam } = useTeamsContext();

	const {
		error,
		formValues: { email, name },
		handleChange,
		handleSubmit,
		isSubmitting
	} = useMemberInvitationForm();

	const { t } = useTranslation(undefined, { keyPrefix: 'MEMBER_INVITATION_FORM' });

	return (
		<div
			className={cn(
				'bg-white dark:bg-black text-gray-800 dark:text-gray-100 rounded-xl p-6 w-full  shadow-lg flex flex-col gap-2',
				className
			)}
		>
			<h2 className="text-xl font-semibold">{t('title')}</h2>
			<p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>

			<form onSubmit={handleSubmit} className="space-y-2">
				<InputField
					type="email"
					placeholder={t('enter_email')}
					value={email}
					name="email"
					label={t('email')}
					onChange={handleChange}
					required
				/>
				<InputField
					type="text"
					name="name"
					label={t('name')}
					placeholder={t('enter_name')}
					value={name}
					onChange={handleChange}
					required
				/>
				{/* <RadioGroup onValueChange={handleRoleChange} defaultValue={RoleName.EMPLOYEE}>
					<Label className="text-slate-500 dark:text-white text-sm">{t('select_role')}</Label>
					<div className="flex gap-4">
						{Object.values(RoleName) // Get Role Names
							.filter((elt) => elt == RoleName.EMPLOYEE) // Filter Roles : Only Employee for now
							.map((role) => (
								<div key={role} className="flex items-center space-x-2 cursor-pointer">
									<RadioGroupItem value={role} id={role} />
									<Label htmlFor={role}>{t(`roles.${role.toLowerCase()}` as 'roles.manager')}</Label>
								</div>
							))}
					</div>
				</RadioGroup> */}

				{error && <p className="text-red-500 text-sm">{error}</p>}

				<div className=" items-center mt-2">
					<ThemedButton
						disabled={isSubmitting || selectedTeam == 'all'}
						type="submit"
						className="flex items-center gap-2"
					>
						{isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}{' '}
						{t('send_invitation')}
					</ThemedButton>
				</div>

				<TeamsTimerFooter />
			</form>
		</div>
	);
};

export const TeamsMemberInvitationFormDialog = ({
	className,
	trigger
}: {
	trigger?: React.ReactNode;
	className?: string;
}) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'MEMBER_INVITATION_FORM.dialog' });
	return (
		<Dialog
			trigger={
				trigger ? (
					trigger
				) : (
					<ThemedButton>
						<Plus size={18} /> {t('invite_member')}
					</ThemedButton>
				)
			}
		>
			<TeamsMemberInvitationForm className={cn('p-0 shadow-none bg-inherit', className)} />
		</Dialog>
	);
};
