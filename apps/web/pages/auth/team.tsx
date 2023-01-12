import { useAuthenticationTeam, IStepProps } from '@app/hooks';
import {
	Card,
	Text,
	InputField,
	Button,
	SiteReCAPTCHA,
	BackdropLoader,
} from 'lib/components';
import { ArrowLeft } from 'lib/components/svgs';
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

	return (
		<AuthLayout
			title="Create New Team"
			description="Please enter your team details to create a new team."
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

			<BackdropLoader
				show={loading}
				title="We are now creating your new workplace, hold on..."
			/>
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
	return (
		<div className="flex flex-col justify-between items-center min-h-[186px]">
			<Text.Heading as="h3" className="text-center">
				Input your team name
			</Text.Heading>

			<InputField
				name="team"
				value={form.team}
				errors={errors}
				onChange={handleOnChange}
				placeholder="Please Enter your team name"
				required
			/>

			<div className="flex justify-between w-full items-center">
				<Text.Link
					href="/auth/passcode"
					underline
					variant="primary"
					className="text-xs dark:text-gray-400 font-normal"
				>
					Joining existing team?
				</Text.Link>

				<Button type="submit">Continue</Button>
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
	const [feedback, setFeedback] = useState<string>('');

	return (
		<div className="flex flex-col justify-between items-center h-full">
			<Text.Heading as="h3" className="text-center mb-10">
				Input details teams
			</Text.Heading>

			<div className="w-full mb-8">
				<InputField
					placeholder="Enter your name"
					name="name"
					value={form.name}
					errors={errors}
					onChange={handleOnChange}
				/>
				<InputField
					type="email"
					placeholder="Enter your email address"
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
							onErrored={() =>
								setFeedback('network issue, please try again later')
							}
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
				<button
					type="button"
					className="flex items-center"
					onClick={onPreviousStep}
				>
					<ArrowLeft className="mr-2" />
					<span className="text-sm">Back</span>
				</button>

				<Button type="submit" disabled={loading}>
					Create team
				</Button>
			</div>
		</div>
	);
}
