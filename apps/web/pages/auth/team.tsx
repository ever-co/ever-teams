import { useAuthenticationTeam, IStepProps } from '@app/hooks';
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
		SECOND_STEP,
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
			<form onSubmit={handleSubmit} className="w-[98%] md:w-[530px]">
				<Card className="w-full" shadow="bigger">
					{step === FIRST_STEP && (
						<FillTeamNameForm
							errors={errors}
							handleOnChange={handleOnChange}
							form={formValues}
						/>
					)}

					<div hidden={step !== SECOND_STEP}>
						<FillUserDataForm
							errors={errors}
							handleOnChange={handleOnChange}
							form={formValues}
							onPreviousStep={() => setStep(FIRST_STEP)}
							loading={loading}
						/>
					</div>
				</Card>
			</form>

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
}: IStepProps & { errors: Record<string, string> }) {
	const { trans, translations } = useTranslation('authTeam');

	return (
		<div className="flex flex-col justify-between items-center min-h-[186px]">
			<Text.Heading as="h3" className="text-center">
				{trans.INPUT_TEAM_NAME}
			</Text.Heading>

			<InputField
				name="team"
				value={form.team}
				errors={errors}
				onChange={handleOnChange}
				placeholder={translations.form.TEAM_NAME_PLACEHOLDER}
				required
			/>

			<div className="flex justify-between w-full items-center">
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
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
	loading?: boolean;
}) {
	const { trans, translations } = useTranslation('authTeam');
	const [feedback, setFeedback] = useState<string>('');

	return (
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
				/>
				<InputField
					type="email"
					placeholder={translations.form.EMAIL_PLACEHOLDER}
					wrapperClassName="mb-5"
					name="email"
					value={form.email}
					errors={errors}
					onChange={handleOnChange}
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
	);
}
