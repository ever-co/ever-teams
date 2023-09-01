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
import { Avatar } from 'lib/components';
import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { CircleIcon, TickCircleIconV2 } from 'lib/components/svgs';
import stc from 'string-to-color';

export default function AuthPasscode() {
	const form = useAuthenticationPasscode();
	const { trans } = useTranslation('authLogin');
	const translation = useTranslation();

	return (
		<AuthLayout
			title={trans.HEADING_TITLE}
			description={
				form.authScreen.screen === 'workspace' ? (
					<>
						<span>
							{translation.trans.pages.authLogin.HEADING_WORKSPACE_LINE1}
						</span>
						<br />
						<span>
							{translation.trans.pages.authLogin.HEADING_WORKSPACE_LINE2}
						</span>
					</>
				) : (
					trans.HEADING_DESCRIPTION
				)
			}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div
					className={clsxm('flex flex-row transition-[transform] duration-500')}
				>
					{form.authScreen.screen === 'email' && (
						<EmailScreen form={form} className={clsxm('w-full')} />
					)}
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
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
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
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>

					<div className="w-full flex justify-between mt-6 items-center">
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
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
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

					<div className="w-full flex justify-between mt-10">
						{/* Send code */}
						<div className="flex flex-col space-y-2">
							<div className="flex flex-row items-center space-x-2 mb-1">
								<Text className="text-xs text-gray-500 dark:text-gray-400 font-normal">
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
									<SpinnerLoader size={15} className="self-center" />
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

function WorkSpaceScreen({
	form,
	className,
}: { form: TAuthenticationPasscode } & IClassName) {
	const { trans } = useTranslation();

	const [selectedWorkspace, setSelectedWorkspace] = useState('');
	const [selectedTeam, setSelectedTeam] = useState('');

	const worksaces = [
		{
			id: '1',
			name: 'Workspace 1',
			teams: [
				{
					id: '1',
					name: 'Team A',
					membersCount: 2,
				},
				{
					id: '2',
					name: 'Team B',
					membersCount: 4,
				},
			],
		},
		{
			id: '2',
			name: 'Workspace 2',
			teams: [
				{
					id: '3',
					name: 'Team A',
					membersCount: 2,
				},
				{
					id: '4',
					name: 'Team B',
					membersCount: 4,
				},
			],
		},
	];

	return (
		<form
			className={clsxm(className, 'flex justify-center w-full')}
			onSubmit={form.handleSubmit}
			autoComplete="off"
		>
			<Card className="w-full max-w-[30rem] dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col justify-between items-center gap-8">
					<Text.Heading as="h3" className="text-center">
						{trans.pages.auth.SELECT_WORKSPACE}
					</Text.Heading>

					<div className="flex flex-col w-full gap-4 max-h-[16.9375rem] overflow-scroll scrollbar-hide">
						{worksaces.map((worksace) => (
							<div
								key={worksace.id}
								className={`w-full flex flex-col border border-[#0000001A] dark:border-[#34353D] ${
									selectedWorkspace === worksace.id
										? 'bg-[#FCFCFC] dark:bg-[#1F2024]'
										: ''
								} hover:bg-[#FCFCFC] dark:hover:bg-[#1F2024] rounded-xl`}
							>
								<div className="text-base font-medium py-[1.25rem] px-4 flex flex-col gap-[1.0625rem]">
									<div className="flex justify-between">
										<span>{worksace.name}</span>
										<span
											className="hover:cursor-pointer"
											onClick={() => {
												setSelectedWorkspace(worksace.id);
												if (
													selectedTeam &&
													!worksace.teams
														.map((team) => team.id)
														.includes(selectedTeam)
												) {
													setSelectedTeam(worksace.teams[0].id);
												}
											}}
										>
											{selectedWorkspace === worksace.id ? (
												<TickCircleIconV2 className="w-6 h-6 stroke-[#27AE60] fill-[#27AE60]" />
											) : (
												<CircleIcon className="w-6 h-6" />
											)}
										</span>
									</div>
									<div className="w-full h-[1px] bg-[#E5E5E5] dark:bg-[#34353D]"></div>
									<div className="flex flex-col gap-4 px-5 py-1.5">
										{worksace.teams.map((team) => (
											<div
												key={`${worksace.id}-${team.id}`}
												className="flex items-center justify-between gap-4 min-h-[2.875rem]"
											>
												<span className="flex items-center gap-4 justify-between">
													<Avatar
														imageTitle={team.name}
														size={34}
														backgroundColor={`${stc(team.name)}80`}
													/>
													{team.name}({team.membersCount})
												</span>
												<span
													className="hover:cursor-pointer"
													onClick={() => {
														setSelectedTeam(team.id);
														if (selectedWorkspace !== worksace.id) {
															setSelectedWorkspace(worksace.id);
														}
													}}
												>
													{selectedTeam === team.id ? (
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

					<div className="w-full flex justify-between">
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
							loading={form.loading}
							disabled={form.loading}
						>
							{trans.common.CONTINUE}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}
