import { getAccessTokenCookie } from '@app/helpers';
import { useAuthenticateUser } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Card, Text } from 'lib/components';
import { CloseIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';

export function UnverifiedEmail() {
	const { user } = useAuthenticateUser();
	const { trans, translations } = useTranslation('home');
	const [verified, setVefified] = useState(true);

	const closeIt = useCallback(() => {
		window.localStorage.setItem(
			'unverified-message-closed',
			getAccessTokenCookie()
		);
		setVefified(true);
	}, [setVefified]);

	useEffect(() => {
		const closed =
			window.localStorage.getItem('unverified-message-closed') ===
			getAccessTokenCookie();

		if (closed) {
			setVefified(true);
			return;
		}

		setVefified(user ? !!user.employee.isVerified : true);
	}, [user]);

	return !verified ? (
		<Card
			shadow="bigger"
			className={clsxm(
				'w-full mt-6 flex justify-between',
				'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
			)}
		>
			<Text>
				{trans.SENT_EMAIL_VERIFICATION}. {translations.common.PLEASE}{' '}
				<span className="text-primary dark:text-primary-light">
					{translations.common.VERIFY}
				</span>{' '}
				{translations.common.YOUR_EMAIL}
			</Text>

			<button onClick={closeIt}>
				<CloseIcon />
			</button>
		</Card>
	) : (
		<></>
	);
}
