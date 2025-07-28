import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';
import { cn } from '@/core/lib/helpers';
import { Link } from 'lucide-react';
import { Button } from '@/core/components';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/core/components/common/checkbox';
import { TERMS_LINK } from '@/core/constants/config/constants';

export function CompleteInvitationRegistrationForm() {
	const t = useTranslations();

	return (
		<div className="w-full flex flex-col gap-10 dark:bg-transparent rounded-2xl md:w-[35rem] ">
			<div className="w-full px-8 flex flex-col gap-2 text-center">
				<h2 className="font-medium text-3xl">
					{t('pages.invite.acceptInvite.ACCEPT_INVITATION_TO_TEAM', { team: 'Workout' })}
				</h2>
				<p className=" text-lg text-gray-400">
					{t(t('pages.invite.acceptInvite.COMPLETE_REGISTRATION', { userEmail: 'user@example.com' }))}
				</p>
			</div>
			<EverCard className={cn('w-full  bg-[#ffffff] dark:bg-[#25272D]')} shadow="custom">
				<form className="flex flex-col gap-1 items-center justify-between">
					<div className="w-full flex flex-col items-center gap-8">
						<Text.Heading as="h3" className="text-center">
							{t('pages.invite.acceptInvite.USER_DETAILS')}
						</Text.Heading>
						<div className="w-full">
							<InputField
								name="email"
								type="email"
								placeholder={t('form.EMAIL_PLACEHOLDER')}
								// value={}
								// errors={}
								// onChange={}
								autoComplete="off"
								wrapperClassName="dark:bg-[#25272D]"
								className="dark:bg-[#25272D]"
							/>

							<InputField
								type="password"
								name="password"
								placeholder={t('form.PASSWORD_PLACEHOLDER')}
								className="dark:bg-[#25272D]"
								wrapperClassName="dark:bg-[#25272D]"
								// value={}
								// errors={}
								// onChange={}
								autoComplete="off"
							/>

							<InputField
								type="password"
								name="confirmPassword"
								placeholder={'Confirm your Password'}
								className="dark:bg-[#25272D]"
								wrapperClassName="mb-5 dark:bg-[#25272D]"
								// value={}
								// errors={}
								// onChange={}
								autoComplete="off"
							/>

							<Text.Error className="justify-self-start self-start">{}</Text.Error>
						</div>
					</div>

					<div className="flex items-center justify-between w-full">
						<div className="flex items-center gap-2">
							<Checkbox />
							<p className="space-x-2">
								Agree to
								<a
									href={TERMS_LINK}
									target="_blank"
									className="text-primary dark:text-gray-300"
									rel="noreferrer"
								>
									Terms & Conditions
								</a>
							</p>
						</div>

						<Button className="px-6" type="submit">
							{t('common.JOIN_REQUEST')}
						</Button>
					</div>
				</form>
			</EverCard>
		</div>
	);
}
