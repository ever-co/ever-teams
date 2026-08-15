import { usePasswordLoginForm } from '@hooks/usePasswordLoginForm';
import { cn, Input, ThemedButton } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TeamsPasswordLoginForm = ({
	className,
	redirectHandler
}: {
	className?: string;
	redirectHandler?: () => void;
}) => {
	const form = usePasswordLoginForm({ redirectHandler });
	const { t } = useTranslation();
	return (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-3 min-w-[20rem] ', className)}>
			<label htmlFor="email" className="text-slate-500 dark:text-white">
				{t('COMMON.email')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.email_prompt')}
				value={form.formData.email}
				size={30}
				type="email"
				name="email"
			/>

			<label htmlFor="password" className="text-slate-500 dark:text-white">
				{t('COMMON.password')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.password_prompt')}
				value={form.formData.password}
				size={30}
				name="password"
				type="password"
			/>

			{form.error && <span className="text-red-500 text-xs">{form.error}</span>}

			<ThemedButton disabled={(form.error ? true : false) || form.loading} className="flex gap-2">
				{form.loading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_in_title').toUpperCase()}
			</ThemedButton>
		</form>
	);
};

export { TeamsPasswordLoginForm };
