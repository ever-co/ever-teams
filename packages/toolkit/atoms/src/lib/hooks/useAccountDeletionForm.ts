import { getErrorMessage } from '@ever-teams/toolkit-ui';
import { useState } from 'react';

export const useAccountDeletionForm = () => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [confirm, setConfirm] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(() => e.target.value);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			if (password == '' || password.length < 4) {
				setError('Password must be at least 4 characters long');
				setLoading(false);
				return;
			}

			setConfirm(true);

			// const res = await deleteUser(user);
		} catch (error) {
			reportError(getErrorMessage(error));
		}
		setLoading(false);
	};

	return {
		password,
		loading,
		confirm,
		setConfirm,
		error,
		handleChange,
		handleSubmit
	};
};
