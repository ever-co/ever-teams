import { useAuthenticationTeam, IStepProps } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	Card,
	Text,
	InputField,
	Button,
	SiteReCAPTCHA,
	BackdropLoader,
	BackButton,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { AuthLayout } from 'lib/layout';
import { useState } from 'react';

export default function AuthTeam() {
	const {
		handleSubmit,
		step,
		FIRST_STEP,
		// SECOND_STEP,
		handleOnChange,
		setStep,
		errors,
		formValues,
		loading,
	} = useAuthenticationTeam();

	const { trans } = useTranslation('authTeam');

	return (
		<AuthLayout
			title={trans.HEADING_TITLE}
			description={trans.HEADING_DESCRIPTION}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<form onSubmit={handleSubmit} autoComplete="off">
					<div
						className={clsxm(
							'w-[200%] flex flex-row transition-[transform] duration-500',
							step !== FIRST_STEP && ['-translate-x-[550px]']
						)}
					>
						<div className="w-1/2">
							<FillTeamNameForm
								errors={errors}
								handleOnChange={handleOnChange}
								form={formValues}
							/>
						</div>

						<div
							className={clsxm(
								'w-1/2 transition-[visibility] ease-out duration-700',
								step === FIRST_STEP && ['invisible']
							)}
						>
							<FillUserDataForm
								errors={errors}
								handleOnChange={handleOnChange}
								form={formValues}
								onPreviousStep={() => setStep(FIRST_STEP)}
								loading={loading}
							/>
						</div>
					</div>
				</form>
			</div>
			<BackdropLoader show={loading} title={trans.LOADING_TEXT} />
		</AuthLayout>
	);
}

/**
 * First step form Component
 *
 * @param param0
 * @returns
 */
function FillTeamNameForm({
	form,
	errors,
	handleOnChange,
	className,
}: IStepProps & { errors: Record<string, string> } & IClassName) {
	const { trans, translations } = useTranslation('authTeam');

	return (
		<Card className={clsxm('w-full', className)} shadow="custom">
			<div className="flex flex-col justify-between items-center">
				<Text.Heading as="h3" className="text-center mb-7">
					{trans.INPUT_TEAM_NAME}
				</Text.Heading>

				<InputField
					name="team"
					value={form.team}
					errors={errors}
					onChange={handleOnChange}
					placeholder={translations.form.TEAM_NAME_PLACEHOLDER}
					autoComplete="off"
					required
				/>

				<div className="w-full flex justify-between mt-6 items-center">
					<Text.Link
						href="/auth/passcode"
						underline
						variant="primary"
						className="text-xs dark:text-gray-400 font-normal"
					>
						{translations.pages.auth.LOGIN}
					</Text.Link>

					<Button type="submit">{translations.common.CONTINUE}</Button>
				</div>
			</div>
		</Card>
	);
}

/**
 * Second step form component
 *
 * @param param0
 * @returns
 */
function FillUserDataForm({
	form,
	errors,
	handleOnChange,
	onPreviousStep,
	loading,
	className,
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
	loading?: boolean;
} & IClassName) {
	const { trans, translations } = useTranslation('authTeam');
	const [feedback, setFeedback] = useState<string>('');

	return (
		<Card className={clsxm('w-full', className)} shadow="bigger">
			<div className="flex flex-col justify-between items-center h-full">
				<Text.Heading as="h3" className="text-center mb-10">
					{trans.CREATE_FIRST_TEAM}
				</Text.Heading>

				<div className="w-full mb-8">
					<InputField
						placeholder={translations.form.NAME_PLACEHOLDER}
						name="name"
						value={form.name}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
					/>
					<InputField
						type="email"
						placeholder={translations.form.EMAIL_PLACEHOLDER}
						wrapperClassName="mb-5"
						name="email"
						value={form.email}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
					/>

					<div className="w-full flex">
						<div className="dark:invert-[0.88] dark:hue-rotate-180 scale-[1] origin-[0]">
							<SiteReCAPTCHA
								onChange={(res) => {
									handleOnChange({ target: { name: 'recaptcha', value: res } });
									setFeedback('');
								}}
								onErrored={() => setFeedback(translations.errors.NETWORK_ISSUE)}
							/>
							{(errors['recaptcha'] || feedback) && (
								<Text.Error className="self-start justify-self-start">
									{errors['recaptcha'] || feedback}
								</Text.Error>
							)}
						</div>
					</div>
				</div>

				<div className="flex justify-between w-full items-center">
					<BackButton onClick={onPreviousStep} />

					<Button type="submit" disabled={loading}>
						{trans.CREATE_TEAM}
					</Button>
				</div>
			</div>
		</Card>
	);
}
