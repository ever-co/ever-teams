import { authLogin, updateUser } from '@ever-teams/api';
import { getErrorMessage, toast } from '@ever-teams/toolkit-ui';
import { useState } from 'react';
import { useTeamsContext } from '@lib/context/teams-context';

export const usePasswordUpdateForm = () => {
	const { authenticatedUser } = useTeamsContext();
	const email = authenticatedUser?.email ?? '';
	const [passwords, setPasswords] = useState({
		current: '',
		new: '',
		confirm: '',
		deleteConfirm: ''
	});
	const [errors, setErrors] = useState<string[]>();
	const [loading, setLoading] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setErrors([]);
		try {
			if (passwords.current.length < 4 || passwords.new.length < 4 || passwords.confirm.length < 4) {
				setErrors(['Passwords must be at least 4 characters']);
				return;
			}

			if (passwords.new !== passwords.confirm) {
				setErrors([`New password and confirm password do not match`]);
				return;
			}

			const loggedUser = await authLogin({ email, password: passwords.current });

			if ('message' in loggedUser || 'error' in loggedUser) {
				const isServerError = 'statusCode' in loggedUser;

				if (isServerError && loggedUser.statusCode === 401) {
					setErrors(['Current password is incorrect']);
					return;
				}
				const errorMessage =
					'message' in loggedUser
						? Array.isArray(loggedUser.message)
							? loggedUser.message.join(', ')
							: loggedUser.message
						: String(loggedUser.error);

				setErrors([errorMessage]);
				toast({
					variant: 'destructive',
					description: errorMessage
				});
				return;
			}

			const { token, user } = loggedUser;

			const res = await updateUser({
				body: {
					hash: passwords.new,
					organizationId: user.employee.organizationId,
					tenantId: user.tenantId
				},
				token,
				userId: user.id
			});

			if ('message' in res || 'error' in res) {
				const errorMessage =
					'message' in res
						? Array.isArray(res.message)
							? res.message.join(', ')
							: res.message
						: String(res.error);

				setErrors([errorMessage]);
				toast({
					variant: 'destructive',
					description: errorMessage
				});
				return;
			}

			toast({ description: 'Password updated successfully', variant: 'default', title: 'Success' });
		} catch (error) {
			toast({
				variant: 'destructive',
				description: getErrorMessage(error)
			});
		} finally {
			setLoading(false);
		}
	};

	return {
		passwords,
		loading,
		errors,
		handleChange,
		handleSubmit
	};
};
