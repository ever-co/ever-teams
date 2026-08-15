import { createCompleteAccount } from '@ever-teams/api';
import { getErrorMessage, reportError } from '@ever-teams/toolkit-ui';
import { useState } from 'react';
import { useTeamsContext } from '../context/teams-context';
import { useAccessToken } from './useAccessToken';
import { useTranslation } from 'react-i18next';

const useRegistrationForm = (redirectHandler?: () => void) => {
	const [formData, setFormData] = useState<{
		fullName: string;
		email: string;
		password: string;
		confirmPassword: string;
		acceptTerms: boolean;
	}>({ fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false });
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const { setToken } = useTeamsContext();

	const { t } = useTranslation();

	const { setAccessToken } = useAccessToken();

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setErrors([]);
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleCheckboxChange = (checked: boolean) => {
		setErrors([]);
		setFormData((prev) => ({ ...prev, acceptTerms: checked }));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setErrors([]);

		if (formData.fullName.trim() == '') {
			setErrors([t('ERROR.is_required', { field: t('COMMON.full_name') })]);
			setLoading(false);
			return;
		}

		if (formData.email.trim() == '') {
			setErrors([t('ERROR.is_required', { field: t('COMMON.email') })]);
			setLoading(false);
			return;
		}

		if (formData.password == '') {
			setErrors([t('ERROR.is_required', { field: t('COMMON.password') })]);
			setLoading(false);
			return;
		}

		if (formData.confirmPassword == '') {
			setErrors([t('ERROR.is_required', { field: t('COMMON.password') })]);
			setLoading(false);
			return;
		}

		if (formData.password !== formData.confirmPassword) {
			setErrors([t('ERROR.passwords_not_match')]);
			setLoading(false);
			return;
		}

		if (formData.password.length < 4 || formData.confirmPassword.length < 4) {
			setErrors([t('ERROR.password_length', { number: 4 })]);
			setLoading(false);
			return;
		}

		if (formData.acceptTerms == false) {
			setErrors([t('ERROR.accept_terms_and_conditions')]);
			setLoading(false);
			return;
		}

		const { fullName, email, password, confirmPassword } = formData;

		try {
			// Signup User

			const registeredUser = await createCompleteAccount({ confirmPassword, fullName, email, password });

			if ('message' in registeredUser || 'error' in registeredUser) {
				const errorMessage =
					'message' in registeredUser
						? Array.isArray(registeredUser.message)
							? registeredUser.message.join(', ')
							: registeredUser.message
						: String(registeredUser.error);

				reportError(errorMessage);
				setLoading(false);
				setErrors([errorMessage]);
				return;
			}

			setToken(registeredUser.token);
			setAccessToken(registeredUser.token);

			redirectHandler && redirectHandler();
		} catch (error) {
			reportError(getErrorMessage(error));
			setLoading(false);
			return;
		}

		setLoading(false);
	};

	return {
		formData,
		handleInputChange,
		handleCheckboxChange,
		loading,
		handleSubmit,
		errors
	};
};

export { useRegistrationForm };
