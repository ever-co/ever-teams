import { IStepProps, useAuthenticationTeam } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { BackButton, BackdropLoader, Button, Card, InputField, SiteReCAPTCHA, Text } from 'lib/components';
import { AuthLayout } from 'lib/layout';
import { GetStaticProps, GetStaticPropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
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
		loading
	} = useAuthenticationTeam();

	const { t } = useTranslation();

	return (
		<AuthLayout title={t('pages.authTeam.HEADING_TITLE')} description={t('pages.authTeam.HEADING_DESCRIPTION')}>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<form onSubmit={handleSubmit} autoComplete="off">
					<div
						className={clsxm(
							'w-[200%] flex flex-row transition-[transform] duration-500',
							step !== FIRST_STEP && ['-translate-x-[50%]']
						)}
					>
						<div className="w-1/2">
							<FillTeamNameForm errors={errors} handleOnChange={handleOnChange} form={formValues} />
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
			<BackdropLoader show={loading} title={t('pages.authTeam.LOADING_TEXT')} />
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
	className
}: IStepProps & { errors: Record<string, string> } & IClassName) {
	const { t } = useTranslation();

	return (
		<Card className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="custom">
			<div className="flex flex-col items-center justify-between">
				<Text.Heading as="h3" className="text-center mb-7">
					{t('pages.authTeam.INPUT_TEAM_NAME')}
				</Text.Heading>

				<InputField
					name="team"
					value={form.team}
					errors={errors}
					onChange={handleOnChange}
					placeholder={t('form.TEAM_NAME_PLACEHOLDER')}
					autoComplete="off"
					wrapperClassName="dark:bg-[#25272D]"
					className="dark:bg-[#25272D]"
					required
				/>

				<div className="flex items-center justify-between w-full mt-6">
					<Text.Link href="/auth/passcode" underline variant="primary" className="font-normal">
						{t('pages.auth.LOGIN')}
					</Text.Link>

					<Button type="submit">{t('common.CONTINUE')}</Button>
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
	className
}: IStepProps & {
	errors: Record<string, string>;
	onPreviousStep?: () => void;
	loading?: boolean;
} & IClassName) {
	const { t } = useTranslation();
	const [feedback, setFeedback] = useState<string>('');

	return (
		<Card className={clsxm('w-full dark:bg-[#25272D]', className)} shadow="bigger">
			<div className="flex flex-col items-center justify-between h-full">
				<Text.Heading as="h3" className="mb-10 text-center">
					{t('pages.authTeam.CREATE_FIRST_TEAM')}
				</Text.Heading>

				<div className="w-full mb-8">
					<InputField
						placeholder={t('form.NAME_PLACEHOLDER')}
						name="name"
						value={form.name}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>
					<InputField
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						className="dark:bg-[#25272D]"
						wrapperClassName="mb-5 dark:bg-[#25272D]"
						name="email"
						value={form.email}
						errors={errors}
						onChange={handleOnChange}
						autoComplete="off"
					/>

					<div className="flex w-full">
						<div className="dark:invert-[0.88] dark:hue-rotate-180 scale-[1] origin-[0]">
							<SiteReCAPTCHA
								onChange={(res) => {
									handleOnChange({ target: { name: 'recaptcha', value: res } });
									setFeedback('');
								}}
								onErrored={() => setFeedback(t('errors.NETWORK_ISSUE'))}
							/>
							{(errors['recaptcha'] || feedback) && (
								<Text.Error className="self-start justify-self-start">
									{errors['recaptcha'] || feedback}
								</Text.Error>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center justify-between w-full">
					<BackButton onClick={onPreviousStep} />

					<Button type="submit" disabled={loading}>
						{t('pages.authTeam.CREATE_TEAM')}
					</Button>
				</div>
			</div>
		</Card>
	);
}

export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
	const { locale } = context;
	const translateProps = await serverSideTranslations(locale ?? 'en', ['default']);
	return {
		props: {
			...translateProps
		}
	};
};
