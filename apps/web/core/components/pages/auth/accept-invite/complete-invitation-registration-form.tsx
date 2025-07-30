import { BackdropLoader, Button } from '@/core/components';
import { Checkbox } from '@/core/components/common/checkbox';
import { EverCard } from '@/core/components/common/ever-card';
import { Text } from '@/core/components/common/typography';
import { InputField } from '@/core/components/duplicated-components/_input';
import { TERMS_LINK } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { TInviteVerified } from '@/core/types/schemas/user/invite.schema';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function CompleteInvitationRegistrationForm(props: {
	invitationData: TInviteVerified;
	onCompleteRegistration: (data: { fullName: string; password: string }) => Promise<void>;
	acceptInvitationLoading: boolean;
}) {
	const t = useTranslations();
	const { invitationData, onCompleteRegistration, acceptInvitationLoading } = props;
	const [aggreeToTerms, setAgreeToTerms] = useState(false);
	const router = useRouter();
	const [loadingWorkspace, setLoadingWorkspace] = useState(false);

	const [userDetails, setUserDetails] = useState({
		fullName: invitationData.fullName || '',
		password: '',
		confirmPassword: ''
	});

	const [errors, setErrors] = useState({
		fullName: '',
		password: '',
		confirmPassword: '',
		acceptInviteFailed: ''
	});

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			try {
				e.preventDefault();

				setErrors({
					fullName: '',
					password: '',
					confirmPassword: '',
					acceptInviteFailed: ''
				});

				if (userDetails.password !== userDetails.confirmPassword) {
					setErrors({
						...errors,
						confirmPassword: t('errors.PASSWORDS_DO_NOT_MATCH')
					});

					return;
				}

				await onCompleteRegistration(userDetails);
				setLoadingWorkspace(true);
				router.push('/');
			} catch (error) {
				setErrors({
					...errors,
					acceptInviteFailed: 'Failed to accept invitation'
				});
				console.error('Failed to accept invitation:', error);
			}
		},
		[onCompleteRegistration, userDetails, errors, t]
	);

	useEffect(() => {
		return () => {
			setLoadingWorkspace(false);
		};
	}, []);

	return (
		<div className="w-full flex flex-col gap-10 dark:bg-transparent rounded-2xl md:w-[35rem] ">
			<div className="w-full px-8 flex flex-col gap-2 text-center">
				<h2 className="font-medium text-3xl">
					{t('pages.invite.acceptInvite.ACCEPT_INVITATION_TO_TEAM', {
						team: invitationData.organization.name
					})}
				</h2>
				<p className=" text-lg text-gray-400">
					{t('pages.invite.acceptInvite.COMPLETE_REGISTRATION', { userEmail: invitationData.email })}
				</p>
			</div>
			<EverCard className={cn('w-full  bg-[#ffffff] dark:bg-[#25272D]')} shadow="custom">
				<form className="flex flex-col gap-1 items-center justify-between" onSubmit={handleSubmit}>
					<div className="w-full flex flex-col items-center gap-8">
						<Text.Heading as="h3" className="text-center">
							{t('pages.invite.acceptInvite.USER_DETAILS')}
						</Text.Heading>
						<div className="w-full">
							<InputField
								name="name"
								type="text"
								placeholder={t('form.NAME_PLACEHOLDER')}
								value={userDetails.fullName}
								errors={errors}
								onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
								autoComplete="off"
								wrapperClassName="dark:bg-[#25272D]"
								className="dark:bg-[#25272D]"
								required
							/>

							<InputField
								type="password"
								name="password"
								placeholder={t('form.PASSWORD_PLACEHOLDER')}
								className="dark:bg-[#25272D]"
								wrapperClassName="dark:bg-[#25272D]"
								value={userDetails.password}
								errors={errors}
								onChange={(e) => setUserDetails({ ...userDetails, password: e.target.value })}
								autoComplete="off"
							/>

							<InputField
								type="password"
								name="confirmPassword"
								placeholder={t('form.CONFIRM_PASSWORD_PLACEHOLDER')}
								className="dark:bg-[#25272D]"
								wrapperClassName="mb-5 dark:bg-[#25272D]"
								value={userDetails.confirmPassword}
								errors={errors}
								onChange={(e) => {
									setUserDetails({ ...userDetails, confirmPassword: e.target.value });
								}}
								autoComplete="off"
							/>
							{errors.acceptInviteFailed && (
								<Text.Error className="justify-self-start self-start">
									{errors.acceptInviteFailed}
								</Text.Error>
							)}
						</div>
					</div>

					<div className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2">
							<Checkbox checked={aggreeToTerms} onCheckedChange={() => setAgreeToTerms(!aggreeToTerms)} />
							<p className="space-x-2 dark:text-gray-300">
								{t('form.AGREE_TO')}
								<a
									href={TERMS_LINK}
									target="_blank"
									className="text-primary dark:text-gray-300 dark:font-medium"
									rel="noreferrer"
								>
									{t('layout.footer.TERMS_AND_CONDITIONS')}
								</a>
							</p>
						</div>

						<Button
							loading={acceptInvitationLoading}
							disabled={acceptInvitationLoading || !aggreeToTerms || loadingWorkspace}
							className="px-6"
							type="submit"
						>
							{t('common.JOIN_REQUEST')}
						</Button>
					</div>
				</form>
			</EverCard>
			<BackdropLoader show={loadingWorkspace} title={t('pages.authTeam.LOADING_WORKSPACE')} />
		</div>
	);
}
