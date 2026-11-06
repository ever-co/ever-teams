import { useAuthenticationPasscode } from '@/core/hooks';
import { useResendCooldown } from '@/core/hooks/auth/use-resend-cooldown';
import { Button, Modal, SpinnerLoader, Text, modalFieldLabelClass, modalPrimaryActionClass } from '@/core/components';
import { useTranslations } from 'next-intl';
import { InputField } from '../../duplicated-components/_input';
import { AuthCodeInputField } from '../../auth/auth-code-input';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { AUTH_CODE_CONTAINER_CLASS, AUTH_CODE_SLOT_CLASS } from '../../auth/auth-code-recipe';

/**
 * Join team modal
 */
export function JoinTeamModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const {
		loading,
		formValues,
		setFormValues,
		errors,
		handleChange,
		handleSubmit,
		signInEmailLoading,
		sendAuthCodeHandler,
		inputCodeRef
	} = useAuthenticationPasscode();
	const resendCooldown = useResendCooldown();

	const t = useTranslations();

	// Only a code that went out starts the wait; the hook already shows the error of a failed send
	const resendCode = () => sendAuthCodeHandler()?.then(resendCooldown.start, () => undefined);

	return (
		<Modal isOpen={open} closeModal={closeModal} title={t('pages.auth.JOIN_TEAM')}>
			<form className="flex w-full flex-col gap-5 sm:w-lg" onSubmit={handleSubmit} autoComplete="off">
				<InputField
					type="email"
					placeholder={t('form.EMAIL_PLACEHOLDER')}
					name="email"
					value={formValues.email}
					onChange={handleChange}
					errors={errors}
					wrapperClassName="mb-0"
					required
				/>

				<div className="flex w-full flex-col gap-2.5">
					<Text className={modalFieldLabelClass}>{t('pages.auth.INPUT_INVITE_CODE')}</Text>

					<AuthCodeInputField
						allowedCharacters="alphanumeric"
						length={AUTH_CODE_LENGTH}
						ref={inputCodeRef}
						containerClassName={AUTH_CODE_CONTAINER_CLASS}
						inputClassName={AUTH_CODE_SLOT_CLASS}
						defaultValue={formValues.code}
						onChange={(code) => {
							setFormValues((v) => ({ ...v, code }));
						}}
					/>
					{errors['code'] && (
						<Text.Error className="self-start justify-self-start">{errors['code']}</Text.Error>
					)}
				</div>

				<div className="flex w-full items-end justify-between gap-3 pt-1">
					<div className="flex flex-col items-start">
						<Text className="mb-1 text-xs font-normal text-muted-foreground">
							{t('pages.auth.UNRECEIVED_CODE')}
						</Text>

						{!signInEmailLoading && (
							<button
								type="button"
								className="cursor-pointer text-xs font-normal text-muted-foreground disabled:cursor-default"
								onClick={resendCode}
								disabled={resendCooldown.locked}
							>
								{resendCooldown.locked &&
									`${t('pages.auth.RESEND_CODE_IN')} ${resendCooldown.countdown}`}
								{!resendCooldown.locked && (
									<span className="text-primary-ink">{t('pages.auth.RESEND_CODE')}</span>
								)}
							</button>
						)}
						{signInEmailLoading && <SpinnerLoader size={22} className="self-center" />}
					</div>

					<Button
						type="submit"
						size="default"
						className={modalPrimaryActionClass}
						loading={loading}
						disabled={loading}
					>
						{t('pages.auth.JOIN')}
					</Button>
				</div>
			</form>
		</Modal>
	);
}
