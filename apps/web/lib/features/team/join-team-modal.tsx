import { useAuthenticationPasscode } from '@app/hooks';
import { AuthCodeInputField, Button, Card, InputField, Modal, SpinnerLoader, Text } from 'lib/components';
import { useTranslation } from 'react-i18next';

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
		sendCodeLoading,
		sendAuthCodeHandler,
		inputCodeRef
	} = useAuthenticationPasscode();

	const { t } = useTranslation();

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px]" onSubmit={handleSubmit} autoComplete="off">
				<Card className="w-full" shadow="bigger">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="mb-10 text-center">
							{t('pages.auth.JOIN_TEAM')}
						</Text.Heading>

						{/* Email input */}
						<InputField
							type="email"
							placeholder={t('form.EMAIL_PLACEHOLDER')}
							name="email"
							value={formValues.email}
							onChange={handleChange}
							errors={errors}
							required
						/>

						{/* Auth code input */}
						<div className="w-full mt-5">
							<Text className="text-xs font-normal text-gray-400">
								{t('pages.auth.INPUT_INVITE_CODE')}
							</Text>

							<AuthCodeInputField
								allowedCharacters="alphanumeric"
								length={6}
								ref={inputCodeRef}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								defaultValue={formValues.code}
								onChange={(code) => {
									setFormValues((v) => ({ ...v, code }));
								}}
							/>
							{errors['code'] && (
								<Text.Error className="self-start justify-self-start">{errors['code']}</Text.Error>
							)}
						</div>

						<div className="flex justify-between w-full mt-10">
							{/* Send code */}
							<div className="flex flex-col items-start">
								<Text className="mb-1 text-xs font-normal text-gray-500 dark:text-gray-400">
									{t('pages.auth.UNRECEIVED_CODE')}
								</Text>

								{!sendCodeLoading && (
									<button
										type="button"
										className="text-xs font-normal text-gray-500 cursor-pointer dark:text-gray-400"
										onClick={sendAuthCodeHandler}
									>
										{'Re'}
										<span className="text-primary dark:text-primary-light">
											{t('pages.auth.SEND_CODE')}
										</span>
									</button>
								)}
								{sendCodeLoading && <SpinnerLoader size={22} className="self-center" />}
							</div>

							<Button type="submit" loading={loading} disabled={loading}>
								{t('pages.auth.JOIN')}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
