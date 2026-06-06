import { updateUser, uploadFile } from '@ever-teams/api';
import { IUserUpdateInput } from '@ever-teams/toolkit-types';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from './useAccessToken';
import { getErrorMessage, reportError, toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';

const useProfileForm = () => {
	const { authenticatedUser: user, setAuthenticatedUser, selectedOrganization } = useTeamsContext();
	const [formData, setFormData] = useState<{
		firstName: string;
		lastName: string;
		password: string;
		confirmPassword: string;
		email: string;
		preferredLanguage: string;
		timeZone: string;
		phoneNumber: string;
		timeFormat: string;
	}>({
		firstName: '',
		lastName: '',
		password: '',
		confirmPassword: '',
		email: '',
		preferredLanguage: 'en',
		timeZone: '',
		phoneNumber: '',
		timeFormat: '24'
	});
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const { accessToken: token } = useAccessToken();
	const { t } = useTranslation();

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setErrors([]);
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSelectChange = {
		changeLanguage: (e: string) => {
			setErrors([]);
			setFormData((prev) => ({ ...prev, preferredLanguage: e }));
		},

		changeTimeZone: (e: string) => {
			setErrors([]);
			setFormData((prev) => ({ ...prev, timeZone: e }));
		},

		changeTimeFormat: (e: string) => {
			setErrors([]);
			setFormData((prev) => ({ ...prev, timeFormat: e }));
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setErrors([]);

		if (!user) return;

		if (formData.email.trim() == '') {
			setErrors([t('ERROR.is_required', { field: t('COMMON.email') })]);
			setLoading(false);
			return;
		}

		// if (formData.password !== formData.confirmPassword) {
		// 	setErrors([t('ERROR.passwords_not_match')]);
		// 	setLoading(false);
		// 	return;
		// }

		// if (formData.password.length < 4 || formData.confirmPassword.length < 4) {
		// 	setErrors([t('ERROR.password_length', { number: 4 })]);
		// 	setLoading(false);
		// 	return;
		// }

		const { firstName, lastName, email, timeFormat, timeZone, phoneNumber, preferredLanguage, password } = formData;

		const body: IUserUpdateInput = {
			firstName: firstName,
			lastName: lastName,
			email: email,
			phoneNumber: phoneNumber,
			preferredLanguage: preferredLanguage,
			timeFormat,
			timeZone,
			organizationId: selectedOrganization,
			tenantId: user.tenantId
		};

		if (password) body.hash = password;

		try {
			const registrationResponse = await updateUser({
				token,
				body,
				userId: user?.id
			});

			if (!registrationResponse) {
				reportError('Could not update user');
				setErrors(['Could not update user']);
				setLoading(false);
				return;
			}

			if (registrationResponse instanceof Error) {
				setErrors([registrationResponse.message]);
				reportError(registrationResponse.message);
				setLoading(false);
				return;
			}

			if ('error' in registrationResponse) {
				setErrors([
					typeof registrationResponse.message == 'string'
						? registrationResponse.message
						: registrationResponse.message[0]
				]);
				reportError(registrationResponse.message);
				setLoading(false);
				return;
			}

			toast({
				title: 'Success',
				description: 'Profile updated successfully',
				duration: 5000,
				variant: 'default'
			});

			setAuthenticatedUser({ data: registrationResponse, loading: false });
		} catch (error) {
			reportError(getErrorMessage(error));
			setLoading(false);
			return;
		}

		setLoading(false);
	};

	useEffect(() => {
		if (user)
			setFormData({
				...formData,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				phoneNumber: user.phoneNumber,
				preferredLanguage: user.preferredLanguage,
				timeFormat: user.timeFormat,
				timeZone: user.timeZone
			});
	}, [user]);

	return {
		formData,
		handleInputChange,
		handleSelectChange,
		loading,
		handleSubmit,
		errors
	};
};

const useProfilePictureForm = () => {
	const { authenticatedUser: user, setAuthenticatedUser, selectedOrganization } = useTeamsContext();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const { accessToken } = useAccessToken();

	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string>('');

	useEffect(() => {
		if (file) {
			const newPreview = URL.createObjectURL(file);
			setPreview(newPreview);
			return () => {
				URL.revokeObjectURL(newPreview);
			};
		}
	}, [file]);

	const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setErrors([]);
		const { files } = e.target;
		if (files && files.length > 0) {
			setFile(files[0]);
		}
	};

	const handleSubmitFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!user) {
			setLoading(false);
			setErrors([]);
			return;
		}

		const { files } = e.target;

		if (!files || files.length <= 0) {
			return;
		}

		const file = files[0];

		setErrors([]);
		setLoading(true);

		try {
			const folderName = 'profile_pictures_avatars';

			const uploadedFile = await uploadFile({
				file,
				token: accessToken,
				user,
				folderName
			});

			if ('message' in uploadedFile || 'error' in uploadedFile) {
				const errorMessage =
					'message' in uploadedFile
						? Array.isArray(uploadedFile.message)
							? uploadedFile.message.join(', ')
							: uploadedFile.message
						: String(uploadedFile.error);

				setErrors([errorMessage]);
				reportError(errorMessage);
				setLoading(false);

				return;
			}

			const updatedUser = await updateUser({
				body: {
					imageId: uploadedFile.id,
					imageUrl: uploadedFile.fullUrl,
					organizationId: selectedOrganization,
					tenantId: user.tenantId
				},
				token: accessToken,
				userId: user.id
			});

			if ('message' in updatedUser || 'error' in updatedUser) {
				const errorMessage =
					'message' in updatedUser
						? Array.isArray(updatedUser.message)
							? updatedUser.message.join(', ')
							: updatedUser.message
						: String(updatedUser.error);

				setErrors([errorMessage]);
				reportError(errorMessage);
				setLoading(false);

				return;
			}

			toast({
				title: 'Success',
				description: 'Profile Picture updated successfully',
				duration: 5000,
				variant: 'default'
			});

			setAuthenticatedUser({ data: updatedUser, loading: false });
		} catch (error) {
			reportError(getErrorMessage(error));
		}
		setLoading(false);
	};

	return {
		handleInputChange,
		handleSubmitFile,
		file,
		preview,
		loading,
		errors
	};
};

export { useProfileForm, useProfilePictureForm };
