import { getAccessTokenCookie } from '@app/helpers';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { AuthCodeInputField, Avatar, BackButton, Button, Card, InputField, SpinnerLoader, Text } from 'lib/components';
import { CircleIcon, TickCircleIconV2 } from 'lib/components/svgs';
import { AuthLayout } from 'lib/layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import stc from 'string-to-color';

export default function AuthPasscode() {
	const form = useAuthenticationPasscode();
	const { t } = useTranslation();

	return (
		<AuthLayout
			title={
				form.authScreen.screen === 'workspace'
					? t('pages.authLogin.WORKSPACE')
					: t('pages.authLogin.HEADING_TITLE')
			}
			description={
				form.authScreen.screen === 'workspace' ? (
					<>
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE1')}</span>
						<br />
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE2')}</span>
					</>
				) : (
					t('pages.authLogin.HEADING_DESCRIPTION')
				)
			}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div className={clsxm('flex flex-row transition-[transform] duration-500')}>
					{form.authScreen.screen === 'email' && <EmailScreen form={form} className={clsxm('w-full')} />}
					{form.authScreen.screen === 'passcode' && (
						<PasscodeScreen form={form} className={clsxm('w-full')} />
					)}

					{form.authScreen.screen === 'workspace' && (
						<WorkSpaceScreen form={form} className={clsxm('w-full')} />
					)}
				</div>
			</div>
		</AuthLayout>
	);
}

function EmailScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const { t } = useTranslation();

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
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<Text.Heading as="h3" className="text-center mb-7">
						{t('pages.auth.ENTER_EMAIL')}
					</Text.Heading>

					{/* Email input */}
					<InputField
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						name="email"
						value={form.formValues.email}
						onChange={form.handleChange}
						errors={form.errors}
						required
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>

					<div className="flex items-center justify-between w-full mt-6">
						{/* Send code */}
						<div className="flex flex-col items-start">
							<Link href="/auth/team">
								<BackButton />
							</Link>
						</div>

						<Button type="submit" loading={form.signInEmailLoading} disabled={form.signInEmailLoading}>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

function PasscodeScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const { t } = useTranslation();

	return (
		<form className={className} onSubmit={form.handleCodeSubmit} autoComplete="off">
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<Text.Heading as="h3" className="mb-10 text-center">
						{t('pages.auth.LOGIN')}
					</Text.Heading>

					{/* Auth code input */}
					<div className="w-full mt-5">
						<Text className="text-xs font-normal text-gray-400">{t('pages.auth.INPUT_INVITE_CODE')}</Text>

						<AuthCodeInputField
							key={form.authScreen.screen}
							allowedCharacters="alphanumeric"
							length={6}
							ref={form.inputCodeRef}
							containerClassName="mt-[21px] w-full flex justify-between dark:bg-[#25272D]"
							inputClassName="w-[40px] xs:w-[50px] dark:bg-[#25272D]"
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
							autoFocus={form.authScreen.screen === 'passcode'}
						/>
						{(form.errors['code'] || form.errors['email']) && (
							<Text.Error className="self-start justify-self-start">
								{form.errors['code'] || form.errors['email']}
							</Text.Error>
						)}
					</div>

					<div className="flex justify-between w-full mt-10">
						{/* Send code */}
						<div className="flex flex-col space-y-2">
							<div className="flex flex-row items-center mb-1 space-x-2">
								<Text className="text-xs font-normal text-gray-500 dark:text-gray-400">
									{t('pages.auth.UNRECEIVED_CODE')}
								</Text>

								{!form.sendCodeLoading && (
									<button
										type="button"
										className="text-xs font-normal text-gray-500 cursor-pointer dark:text-gray-400"
										onClick={form.sendAuthCodeHandler}
									>
										{'Re'}
										<span className="text-primary dark:text-primary-light">
											{t('pages.auth.SEND_CODE')}
										</span>
									</button>
								)}
								{form.sendCodeLoading && <SpinnerLoader size={15} className="self-center" />}
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
							loading={form.signInEmailConfirmLoading}
							disabled={form.signInEmailConfirmLoading}
						>
							{t('pages.auth.LOGIN')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

function WorkSpaceScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const { t } = useTranslation();

	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
	const router = useRouter();

	const signInToWorkspace = useCallback(
		(e: any) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	useEffect(() => {
		if (form.workspaces.length === 1) {
			setSelectedWorkspace(0);
			form.workspaces[0].current_teams.length === 1 &&
				setSelectedTeam(form.workspaces[0].current_teams[0].team_id);
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}
	}, [form.workspaces]);

	useEffect(() => {
		if (form.authScreen.screen === 'workspace') {
			const accessToken = getAccessTokenCookie();
			if (accessToken && accessToken.length > 100) {
				router.reload();
			}
		}
	}, [form.authScreen, router]);

	return (
		<form
			className={clsxm(className, 'flex justify-center w-full')}
			onSubmit={signInToWorkspace}
			autoComplete="off"
		>
			<Card className="w-full max-w-[30rem] dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between gap-8">
					<Text.Heading as="h3" className="text-center">
						{t('pages.auth.SELECT_WORKSPACE')}
					</Text.Heading>

					<div className="flex flex-col w-full gap-4 max-h-[16.9375rem] overflow-scroll scrollbar-hide">
						{form.workspaces.map((worksace, index) => (
							<div
								key={index}
								className={`w-full flex flex-col border border-[#0000001A] dark:border-[#34353D] ${
									selectedWorkspace === index ? 'bg-[#FCFCFC] dark:bg-[#1F2024]' : ''
								} hover:bg-[#FCFCFC] dark:hover:bg-[#1F2024] rounded-xl`}
							>
								<div className="text-base font-medium py-[1.25rem] px-4 flex flex-col gap-[1.0625rem]">
									<div className="flex justify-between">
										<span>{worksace.user.tenant.name}</span>
										<span
											className="hover:cursor-pointer"
											onClick={() => {
												setSelectedWorkspace(index);
												if (
													selectedTeam &&
													!worksace.current_teams
														.map((team) => team.team_id)
														.includes(selectedTeam)
												) {
													setSelectedTeam(worksace.current_teams[0].team_id);
												}
											}}
										>
											{selectedWorkspace === index ? (
												<TickCircleIconV2 className="w-6 h-6 stroke-[#27AE60] fill-[#27AE60]" />
											) : (
												<CircleIcon className="w-6 h-6" />
											)}
										</span>
									</div>
									<span className="bg-[#E5E5E5] w-full h-[1px]"></span>
									{/* <div className="w-full h-[1px] bg-[#E5E5E5] dark:bg-[#34353D]"></div> */}
									<div className="flex flex-col gap-4 px-5 py-1.5">
										{worksace.current_teams.map((team) => (
											<div
												key={`${index}-${team.team_id}`}
												className="flex items-center justify-between gap-4 min-h-[2.875rem]"
											>
												<span className="flex items-center justify-between gap-4">
													<Avatar
														imageTitle={team.team_name}
														size={34}
														backgroundColor={`${stc(team.team_name)}80`}
													/>
													<div className="flex justify-between">
														<span className="max-w-[14rem] whitespace-nowrap text-ellipsis overflow-hidden">
															{team.team_name}
														</span>
														<span>({team.team_member_count})</span>
													</div>
												</span>
												<span
													className="hover:cursor-pointer"
													onClick={() => {
														setSelectedTeam(team.team_id);
														if (selectedWorkspace !== index) {
															setSelectedWorkspace(index);
														}
													}}
												>
													{selectedTeam === team.team_id ? (
														<TickCircleIconV2 className="w-5 h-5 stroke-[#27AE60] fill-[#27AE60]" />
													) : (
														<CircleIcon className="w-5 h-5" />
													)}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center justify-between w-full">
						<div className="flex flex-col space-y-2">
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
							loading={form.signInWorkspaceLoading}
							disabled={form.signInWorkspaceLoading || (!selectedWorkspace && selectedWorkspace !== 0)}
							id="continue-to-workspace"
						>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}
