'use client';

import { Button, Text } from '@/core/components';
import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { Card } from '@/core/components/duplicated-components/card';
import { AuthLayout } from '@/core/components/layouts/default-layout';

import { useTranslations } from 'next-intl';

const AuthPasscode = () => {
	const t = useTranslations();

	return (
		<AuthLayout title={t('pages.auth.JOIN_TEAM')} description={t('pages.auth.INPUT_INVITE_CODE_DESC')}>
			<form className="w-[98%] md:w-[530px]" autoComplete="off">
				<Card className="w-full" shadow="bigger">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="text-center">
							{t('pages.auth.INPUT_INVITE_CODE')}
						</Text.Heading>

						{/* Auth code input */}
						<div className="w-full mt-5">
							<AuthCodeInputField
								allowedCharacters="alphanumeric"
								length={6}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								onChange={(code) => {
									console.log(code);
								}}
							/>
						</div>

						<div className="flex justify-between w-full mt-10">
							{/* Send code */}
							<div className="flex flex-col items-start">
								<Text className="mb-1 text-xs font-normal text-gray-500 dark:text-gray-400">
									{t('pages.auth.UNRECEIVED_CODE')}
								</Text>

								<button
									type="button"
									className="text-xs font-normal text-gray-500 cursor-pointer dark:text-gray-400"
								>
									{'Re'}
									<span className="text-primary dark:text-primary-light">
										{t('pages.auth.SEND_CODE')}
									</span>
								</button>
							</div>

							<Button type="submit">{t('pages.auth.JOIN')}</Button>
						</div>
					</div>
				</Card>
			</form>
		</AuthLayout>
	);
};

export default AuthPasscode;
