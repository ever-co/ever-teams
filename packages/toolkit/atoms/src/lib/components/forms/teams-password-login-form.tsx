import { usePasswordLoginForm } from '@hooks/usePasswordLoginForm';
import { cn, ThemedButton } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KitFormError, KitFormField } from './kit-form-field';

const FORM = 'flex flex-col gap-4 min-w-[20rem] ';

function SubmitButton({ loading, disabled, label }: Readonly<{ loading: boolean; disabled: boolean; label: string }>) {
	return (
		<ThemedButton disabled={disabled} className="flex h-9 gap-2">
			{loading && (
				<span className=" animate-spin ">
					<LoaderCircle />
				</span>
			)}
			{label}
		</ThemedButton>
	);
}

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
		<form onSubmit={form.handleSubmit} className={cn(FORM, className)}>
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

			<SubmitButton
				loading={form.loading}
				disabled={Boolean(form.error) || form.loading}
				label={t('AUTH.sign_in_title')}
			/>
		</form>
	);
};

export { TeamsPasswordLoginForm };
