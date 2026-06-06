import { useState } from 'react';
import { toast } from '@ever-teams/toolkit-ui';
import { findRole, sendTeamInvitation } from '@ever-teams/api';
import { RoleName } from '@ever-teams/toolkit-types';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '@lib/context/teams-context';

interface FormValues {
	email: string;
	name: string;
	roleName: RoleName;
}

export const useMemberInvitationForm = () => {
	const { authenticatedUser: user, selectedOrganization: organizationId, selectedTeam } = useTeamsContext();
	const [formValues, setFormValues] = useState<FormValues>({
		email: '',
		name: '',
		roleName: RoleName.EMPLOYEE
	});

	const { accessToken: token } = useAccessToken();
	const [error, setError] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setFormValues((prev) => ({
			...prev,
			[e.target.name]: e.target.value
		}));
		setError(''); // Clear error on change
	};

	const handleRoleChange = (e: string) => {
		setFormValues((prev) => ({
			...prev,
			roleName: e as RoleName
		}));
		setError(''); // Clear error on change
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(''); // Clear previous error

		if (!formValues.email || formValues.email.trim() === '') {
			setError('Email is required');
			toast({
				variant: 'destructive',
				description: 'Email is required'
			});
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(formValues.email)) {
			setError('Invalid email format');
			toast({
				variant: 'destructive',
				description: 'Please enter a valid email address'
			});
			return;
		}

		if (!formValues.name || formValues.name.trim() === '' || formValues.name.length < 3) {
			setError('Member Name is required');
			toast({
				variant: 'destructive',
				description: 'Name is required'
			});
			return;
		}

		if (selectedTeam === 'all') {
			setError('Please select a team');
			toast({
				variant: 'destructive',
				description: 'Please select a team'
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const role = await findRole(formValues.roleName, user, token);

			if ('message' in role || 'error' in role) {
				const errorMessage =
					'message' in role
						? Array.isArray(role.message)
							? role.message.join(', ')
							: role.message
						: String(role.error);

				setError(errorMessage);
				toast({
					variant: 'destructive',
					description: errorMessage
				});

				return;
			}

			const sentInvitation = await sendTeamInvitation({
				user,
				token,
				organizationId,
				roleId: role.id,
				teamId: selectedTeam,
				formData: formValues
			});

			if ('message' in sentInvitation || 'error' in sentInvitation) {
				const errorMessage =
					'message' in sentInvitation
						? Array.isArray(sentInvitation.message)
							? sentInvitation.message.join(', ')
							: sentInvitation.message
						: String(sentInvitation.error);

				setError(errorMessage);
				toast({
					variant: 'destructive',
					description: errorMessage
				});

				return;
			}

			toast({ description: 'Invite sent successfully!', variant: 'default' });

			// // Fetch updated teams
			// setTeams({ data: teams.data, loading: true });
			// const userTeams = await getOrganisationTeams(user, token);

			// if (userTeams && !('error' in userTeams)) setTeams({ data: userTeams, loading: false });
			// else setTeams({ data: teams.data, loading: false });

			resetForm();
		} catch (error: any) {
			setError(error?.message || 'Failed to send invitation');
			toast({
				variant: 'destructive',
				description: error?.message || 'Failed to send invitation'
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormValues({
			email: '',
			name: '',
			roleName: RoleName.EMPLOYEE
		});
	};

	return {
		error,
		formValues,
		handleChange,
		handleRoleChange,
		handleSubmit,
		isSubmitting
	};
};
