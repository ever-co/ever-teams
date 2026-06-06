import { useState } from 'react';
import { toast } from '@ever-teams/toolkit-ui';
import { createTeam, getOrganisationTeams } from '@ever-teams/api';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '@lib/context/teams-context';

interface TeamCreationFormValues {
	teamName: string;
	description?: string;
}

export const useTeamCreationForm = () => {
	const { authenticatedUser: user, selectedOrganization: organizationId } = useTeamsContext();
	const [formValues, setFormValues] = useState<TeamCreationFormValues>({
		teamName: '',
		description: ''
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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(''); // Clear previous error

		if (!formValues.teamName || formValues.teamName.trim() === '' || formValues.teamName.length < 3) {
			// Validate team name
			setError('Team name is required and should be at least 3 characters long');
			toast({
				variant: 'destructive',
				description: 'Team name is required and should be at least 3 characters long'
			});
			return;
		}

		try {
			setIsSubmitting(true);
			const createdTeam = await createTeam({
				currentUser: user,
				token,
				organizationId,
				formData: formValues
			});

			if ('message' in createdTeam || 'error' in createdTeam) {
				const errorMessage =
					'message' in createdTeam
						? Array.isArray(createdTeam.message)
							? createdTeam.message.join(', ')
							: createdTeam.message
						: String(createdTeam.error);

				toast({
					variant: 'destructive',
					description: errorMessage
				});
				setError(errorMessage);

				return;
			}

			// Fetch updated teams

			const userTeams = await getOrganisationTeams({ user, token, organizationId, projectId: null });

			if ('message' in userTeams || 'error' in userTeams) {
				const errorMessage =
					'message' in userTeams
						? Array.isArray(userTeams.message)
							? userTeams.message.join(', ')
							: userTeams.message
						: String(userTeams.error);

				toast({
					variant: 'destructive',
					description: errorMessage
				});
				setError(errorMessage);

				return;
			}

			// TODO : update teams after creation

			toast({ description: 'Team created successfully!', variant: 'default' });
			resetForm();
		} catch (error) {
			setError((error as Error)?.message || 'Failed to create team');
			toast({
				variant: 'destructive',
				description: (error as Error)?.message || 'Failed to create team'
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormValues({
			teamName: '',
			description: ''
		});
	};

	return {
		error,
		formValues,
		handleChange,
		handleSubmit,
		isSubmitting
	};
};
