import { ThemedButton, InputField, cn } from '@ever-teams/toolkit-ui';
import { usePasswordUpdateForm } from '@hooks/usePasswordUpdateForm';
import { useTeamsContext } from '@lib/context/teams-context';
import { LoaderCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TeamsPasswordUpdateForm({ className }: { className?: string }) {
	const { authenticatedUser: user } = useTeamsContext();
	const { handleChange, loading, passwords, errors, handleSubmit } = usePasswordUpdateForm();
	const { t } = useTranslation(undefined, { keyPrefix: 'PASSWORD_UPDATE_FORM' });

	if (!user) return null;

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				'w-full rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-black shadow-xs',
				className
			)}
		>
			<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">{t('title')}</h2>
			<div className="space-y-4">
				<InputField
					label={t('current_password')}
					placeholder={t('enter_current_password')}
					name="current"
					type="password"
					value={passwords.current}
					onChange={handleChange}
					required
				/>
				<InputField
					label={t('new_password')}
					placeholder={t('enter_new_password')}
					name="new"
					type="password"
					value={passwords.new}
					onChange={handleChange}
					required
				/>
				<InputField
					label={t('confirm_new_password')}
					placeholder={t('enter_confirm_new_password')}
					name="confirm"
					type="password"
					value={passwords.confirm}
					onChange={handleChange}
					required
				/>

				{errors && errors[0] ? <span className="text-red-500 text-xs">{errors[0]}</span> : null}

				<ThemedButton
					disabled={loading}
					type="submit"
					className="mt-2 w-fit flex items-center justify-center gap-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 text-sm transition"
				>
					{loading ? (
						<span className="animate-spin ">
							<LoaderCircle />
						</span>
					) : (
						<Lock size={16} />
					)}{' '}
					{t('update_password')}
				</ThemedButton>
			</div>
		</form>
	);
}
