import { usePasswordLoginForm } from '@hooks/usePasswordLoginForm';
import { cn, ThemedButton } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KitFormError, KitFormField } from './kit-form-field';

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
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-4 min-w-[20rem] ', className)}>
			<KitFormField
				label={t('COMMON.email')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.email_prompt')}
				value={form.formData.email}
				size={30}
				type="email"
				name="email"
			/>

			<KitFormField
				label={t('COMMON.password')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.password_prompt')}
				value={form.formData.password}
				size={30}
				name="password"
				type="password"
			/>

			<KitFormError message={form.error} />

			<ThemedButton disabled={Boolean(form.error) || form.loading} className="flex h-9 gap-2">
				{form.loading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_in_title')}
			</ThemedButton>
		</form>
	);
};

export { TeamsPasswordLoginForm };
