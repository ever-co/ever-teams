import { useAuthenticationPasscode } from '@app/hooks';
import {
	AuthCodeInputField,
	Button,
	Card,
	InputField,
	Modal,
	SpinnerLoader,
	Text,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';

/**
 * Join team modal
 */
export function JoinTeamModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const {
		loading,
		formValues,
		setFormValues,
		errors,
		handleChange,
		handleSubmit,
		sendCodeLoading,
		sendAuthCodeHandler,
		inputCodeRef,
	} = useAuthenticationPasscode();

	const { translations } = useTranslation('authPasscode');

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form
				className="w-[98%] md:w-[530px]"
				onSubmit={handleSubmit}
				autoComplete="off"
			>
				<Card className="w-full" shadow="bigger">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center mb-10">
							{translations.pages.auth.JOIN_TEAM}
						</Text.Heading>

						{/* Email input */}
						<InputField
							type="email"
							placeholder={translations.form.EMAIL_PLACEHOLDER}
							name="email"
							value={formValues.email}
							onChange={handleChange}
							errors={errors}
							required
						/>

						{/* Auth code input */}
						<div className="w-full mt-5">
							<Text className="text-xs text-gray-400 font-normal">
								{translations.pages.auth.INPUT_INVITE_CODE}
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
								<Text.Error className="self-start justify-self-start">
									{errors['code']}
								</Text.Error>
							)}
						</div>

						<div className="w-full flex justify-between mt-10">
							{/* Send code */}
							<div className="flex flex-col items-start">
								<Text className="text-xs text-gray-500 dark:text-gray-400 font-normal mb-1">
									{translations.pages.auth.UNRECEIVED_CODE}
								</Text>

								{!sendCodeLoading && (
									<button
										type="button"
										className="text-xs text-gray-500 dark:text-gray-400 font-normal cursor-pointer"
										onClick={sendAuthCodeHandler}
									>
										{'Re'}
										<span className="text-primary dark:text-primary-light">
											{translations.pages.auth.SEND_CODE}
										</span>
									</button>
								)}
								{sendCodeLoading && (
									<SpinnerLoader size={22} className="self-center" />
								)}
							</div>

							<Button type="submit" loading={loading} disabled={loading}>
								{translations.pages.auth.JOIN}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
