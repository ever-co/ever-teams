import { getOrganisationTeams, updateTeam, uploadFile } from '@ever-teams/api';
import { IOrganizationTeamList, PaginationResponse } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';
import { useOrganizationTeams } from '@hooks/useOrganizationTeams';
import { useTeamsContext } from '@lib/context/teams-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FormValues {
	imageId?: string;
	name?: string;
	color?: string;
	size?: string;
	isPublic?: boolean;
}

const defaultFormValues: FormValues = {
	imageId: '',
	name: '',
	color: '',
	size: '',
	isPublic: false
};

export const useTeamSetting = () => {
	const [formValues, setFormValues] = useState<FormValues>(defaultFormValues);

	const { token, selectedTeam, selectedOrganization: organizationId, authenticatedUser: user } = useTeamsContext();

	const { data: fetchedOrganizationTeams } = useOrganizationTeams({ projectId: null });

	// Local state to manage teams data (allows updates after team settings change)
	const [organizationTeams, setOrganizationTeams] = useState<PaginationResponse<IOrganizationTeamList> | null>(
		fetchedOrganizationTeams
	);

	useEffect(() => {
		setOrganizationTeams(fetchedOrganizationTeams);
	}, [fetchedOrganizationTeams]);
	const [error, setError] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string>('');

	const { t } = useTranslation(undefined, { keyPrefix: 'TEAM_SETTING.dialog' });

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormValues((prev) => ({
			...prev,
			[e.target.name]: e.target.value
		}));
		setError(''); // Clear error on change
	};

	const handleRadioChange = (e: string) => {
		setFormValues((prev) => ({
			...prev,
			isPublic: e === 'public' ? true : false
		}));
		setError(''); // Clear error on change
	};

	const handleSelectChange = (e: string) => {
		setFormValues((prev) => ({
			...prev,
			size: e
		}));
		setError(''); // Clear error on change
	};

	const handleInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setError('');
		const { files } = e.target;
		if (files && files.length > 0) {
			setFile(files[0]);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(''); // Clear previous error
		setIsSubmitting(true);

		// API Calls

		try {
			if (selectedTeam === 'all') throw Error('Please select a team to update');

			let imageId = '';

			if (file) {
				const uploadedFile = await uploadFile({ file, token, user, folderName: 'team_avatars' });

				if ('message' in uploadedFile || 'error' in uploadedFile) {
					const errorMessage =
						'message' in uploadedFile
							? Array.isArray(uploadedFile.message)
								? uploadedFile.message.join(', ')
								: uploadedFile.message
							: String(uploadedFile.error);

					setError(errorMessage);
					toast({
						variant: 'destructive',
						description: errorMessage
					});

					return;
				}

				imageId = uploadedFile.id;
			}

			const updatedTeam = await updateTeam({
				currentUser: user,
				organizationId,
				token,
				data: {
					name: formValues.name,
					teamId: selectedTeam,
					color: formValues.color,
					public: formValues.isPublic,
					teamSize: formValues.size,
					imageId
				}
			});

			if ('message' in updatedTeam || 'error' in updatedTeam) {
				const errorMessage =
					'message' in updatedTeam
						? Array.isArray(updatedTeam.message)
							? updatedTeam.message.join(', ')
							: updatedTeam.message
						: String(updatedTeam.error);

				setError(errorMessage);
				toast({
					variant: 'destructive',
					description: errorMessage
				});

				return;
			}
			// Fetch updated teams
			const userTeams = await getOrganisationTeams({ user, token, organizationId, projectId: null });

			if (userTeams && !('error' in userTeams || 'message' in userTeams)) {
				setOrganizationTeams(userTeams);
			}

			toast({ description: t('success'), variant: 'default' });
		} catch (error) {
			setError((error as Error)?.message || t('failure'));
			toast({
				variant: 'destructive',
				description: (error as Error)?.message || t('failure')
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	useEffect(() => {
		if (file) {
			const newPreview = URL.createObjectURL(file);
			setPreview(newPreview);
			return () => {
				URL.revokeObjectURL(newPreview);
			};
		}
	}, [file]);

	useEffect(() => {
		if (selectedTeam && selectedTeam !== 'all') {
			const team = organizationTeams?.items.find((elt) => elt.id === selectedTeam);
			if (team) {
				setFormValues((prev) => ({
					...prev,
					name: team.name,
					color: team.color,
					size: team.teamSize,
					isPublic: team.public
				}));
				setPreview(team.logo || '');
			}
		} else {
			setFormValues(defaultFormValues);
		}
	}, [selectedTeam]);

	return {
		error,
		formValues,
		preview,
		handleChange,
		handleRadioChange,
		handleSelectChange,
		handleInputFileChange,
		handleSubmit,
		isSubmitting
	};
};
