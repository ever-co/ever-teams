import { usePasswordLoginForm } from '@hooks/usePasswordLoginForm';
import type { TwoFactorStep } from '@hooks/useTwoFactorStep';
import { cn, ThemedButton } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KitFormError, KitFormField } from './kit-form-field';
import { AUTH_LINK_BUTTON } from './auth-link';

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

/**
 * The code step of a sign-in for an account with two-factor sign-in on: the authenticator app's code, or a recovery
 * code, in the same form (ever-co/ever-teams#5701).
 */
function TwoFactorCodeStep({
	step,
	email,
	onBack,
	className
}: Readonly<{ step: TwoFactorStep; email: string; onBack: () => void; className?: string }>) {
	const { t } = useTranslation();
	let description = t('AUTH.two_factor_description', { length: step.codeLength, email });
	let label = t('AUTH.two_factor_code_label');
	let switchLabel = t('AUTH.two_factor_use_recovery');
	let inputMode: 'numeric' | 'text' = 'numeric';
	if (step.usesRecoveryCode) {
		description = t('AUTH.two_factor_recovery_description');
		label = t('AUTH.two_factor_recovery_label');
		switchLabel = t('AUTH.two_factor_use_app');
		inputMode = 'text';
	}
	return (
		<form onSubmit={step.handleCodeSubmit} className={cn(FORM, className)}>
			<p className="text-sm text-muted-foreground">{description}</p>

			<KitFormField
				label={label}
				required
				autoFocus
				onChange={step.handleCodeChange}
				value={step.code}
				size={30}
				name="code"
				autoComplete="one-time-code"
				inputMode={inputMode}
			/>

			<KitFormError message={step.error} />

			<SubmitButton
				loading={step.loading}
				disabled={step.blocksSubmit || step.loading}
				label={t('AUTH.two_factor_submit')}
			/>

			<div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm">
				<button type="button" className={AUTH_LINK_BUTTON} onClick={step.toggleRecoveryCode}>
					{switchLabel}
				</button>
				<button type="button" className={AUTH_LINK_BUTTON} onClick={onBack}>
					{t('AUTH.two_factor_back')}
				</button>
			</div>
		</form>
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
	if (form.twoFactor) {
		return (
			<TwoFactorCodeStep
				step={form.twoFactor}
				email={form.formData.email}
				onBack={form.backToPassword}
				className={className}
			/>
		);
	}
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
