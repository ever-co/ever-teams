import { TAuthenticationPasscode, useAuthenticationPasscode } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	AuthCodeInputField,
	BackButton,
	Button,
	Card,
	InputField,
	SpinnerLoader,
	Text,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { AuthLayout } from 'lib/layout';
import Link from 'next/link';
import { FormEvent, useCallback } from 'react';

export default function AuthPasscode() {
	const form = useAuthenticationPasscode();
	const { trans } = useTranslation('authLogin');

	return (
		<AuthLayout
			title={trans.HEADING_TITLE}
			description={trans.HEADING_DESCRIPTION}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div
					className={clsxm(
						'w-[200%] flex flex-row transition-[transform] duration-500',
						form.authScreen.screen !== 'email' && ['-translate-x-[550px]']
					)}
				>
					<EmailScreen form={form} className="w-1/2" />
					<PasscodeScreen
						form={form}
						className={clsxm(
							'w-1/2 transition-[visibility] ease-out duration-700',
							form.authScreen.screen === 'email' && ['invisible']
						)}
					/>
				</div>
			</div>
		</AuthLayout>
	);
}

function EmailScreen({
	form,
	className,
}: { form: TAuthenticationPasscode } & IClassName) {
	const { trans } = useTranslation();

	const handleSendCode = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			form.sendAuthCodeHandler().then(() => {
				form.authScreen.setScreen('passcode');
			});
		},
		[form]
	);

	return (
		<form className={className} autoComplete="off" onSubmit={handleSendCode}>
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col justify-between items-center">
					<Text.Heading as="h3" className="text-center mb-7">
						{trans.pages.auth.ENTER_EMAIL}
					</Text.Heading>

					{/* Email input */}
					<InputField
						type="email"
						placeholder={trans.form.EMAIL_PLACEHOLDER}
						name="email"
						value={form.formValues.email}
						onChange={form.handleChange}
						errors={form.errors}
						required
						autoComplete="off"
					/>

					<div className="w-full flex justify-between mt-6">
						{/* Send code */}
						<div className="flex flex-col items-start">
							<Link href="/auth/team">
								<BackButton />
							</Link>
						</div>

						<Button
							type="submit"
							loading={form.sendCodeLoading}
							disabled={form.sendCodeLoading}
						>
							{trans.common.CONTINUE}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

function PasscodeScreen({
	form,
	className,
}: { form: TAuthenticationPasscode } & IClassName) {
	const { trans } = useTranslation();

	return (
		<form className={className} onSubmit={form.handleSubmit} autoComplete="off">
			<Card className="w-full" shadow="custom">
				<div className="flex flex-col justify-between items-center">
					<Text.Heading as="h3" className="text-center mb-10">
						{trans.pages.auth.LOGIN}
					</Text.Heading>

					{/* Auth code input */}
					<div className="w-full mt-5">
						<Text className="text-xs text-gray-400 font-normal">
							{trans.pages.auth.INPUT_INVITE_CODE}
						</Text>

						<AuthCodeInputField
							key={form.authScreen.screen}
							allowedCharacters="numeric"
							length={6}
							ref={form.inputCodeRef}
							containerClassName="mt-[21px] w-full flex justify-between"
							inputClassName="w-[40px] xs:w-[50px]"
							defaultValue={form.formValues.code}
							onChange={(code) => {
								form.setFormValues((v) => ({ ...v, code }));
							}}
							hintType={
								form.errors['code'] || form.errors['email']
									? 'error'
									: form.authenticated
									? 'success'
									: undefined
							}
						/>
						{(form.errors['code'] || form.errors['email']) && (
							<Text.Error className="self-start justify-self-start">
								{form.errors['code'] || form.errors['email']}
							</Text.Error>
						)}
					</div>

					<div className="w-full flex justify-between mt-10">
						{/* Send code */}

						<div className="flex flex-col space-y-2">
							<div className="flex flex-row items-start space-x-2">
								<Text className="text-xs text-gray-500 dark:text-gray-400 font-normal mb-1">
									{trans.pages.auth.UNRECEIVED_CODE}
								</Text>

								{!form.sendCodeLoading && (
									<button
										type="button"
										className="text-xs text-gray-500 dark:text-gray-400 font-normal cursor-pointer"
										onClick={form.sendAuthCodeHandler}
									>
										{'Re'}
										<span className="text-primary dark:text-primary-light">
											{trans.pages.auth.SEND_CODE}
										</span>
									</button>
								)}
								{form.sendCodeLoading && (
									<SpinnerLoader size={22} className="self-center" />
								)}
							</div>

							<div>
								<BackButton
									onClick={() => {
										form.authScreen.setScreen('email');
										form.setErrors({});
									}}
								/>
							</div>
						</div>

						<Button
							type="submit"
							loading={form.loading}
							disabled={form.loading}
						>
							{trans.pages.auth.LOGIN}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}
