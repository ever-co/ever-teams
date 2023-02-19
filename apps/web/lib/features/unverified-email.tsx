import { getAccessTokenCookie } from '@app/helpers';
import { useAuthenticateUser, useModal } from '@app/hooks';
import { clsxm } from '@app/utils';
import {
	AuthCodeInputField,
	BackButton,
	Button,
	Card,
	Modal,
	Text,
} from 'lib/components';
import { CloseIcon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';

export function UnverifiedEmail() {
	const { user } = useAuthenticateUser();
	const { trans, translations } = useTranslation('home');
	const [verified, setVefified] = useState(true);

	const { openModal, isOpen, closeModal } = useModal();

	const closeIt = useCallback(() => {
		window.localStorage.setItem(
			'unverified-message-closed',
			getAccessTokenCookie()
		);
		// close message popup
		setVefified(true);
	}, [setVefified]);

	useEffect(() => {
		const hasVerified = user ? !!user.employee.isVerified : true;

		if (hasVerified) {
			setVefified(true);
			return;
		}

		const closed =
			window.localStorage.getItem('unverified-message-closed') ===
			getAccessTokenCookie();

		if (closed) {
			setVefified(true);
			return;
		}

		setVefified(false);
	}, [user]);

	return !verified ? (
		<>
			<Card
				shadow="bigger"
				className={clsxm(
					'w-full mt-6 flex justify-between',
					'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
				)}
			>
				<Text>
					{trans.SENT_EMAIL_VERIFICATION}. {translations.common.PLEASE}{' '}
					<span
						className="text-primary dark:text-primary-light cursor-pointer"
						onClick={openModal}
					>
						{translations.common.VERIFY}
					</span>{' '}
					{translations.common.YOUR_EMAIL}
				</Text>

				<button onClick={closeIt}>
					<CloseIcon />
				</button>
			</Card>
			<ConfirmUserModal open={isOpen} closeModal={closeModal} />
		</>
	) : (
		<></>
	);
}

export function ConfirmUserModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { trans } = useTranslation();

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form className="w-[98%] md:w-[530px]" autoComplete="off">
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-center">
							{trans.common.SECURITY_CODE}
						</Text.Heading>

						<div className="w-full mt-5">
							<AuthCodeInputField
								allowedCharacters="numeric"
								length={6}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								onChange={(code) => {}}
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button type="submit" loading={false}>
								{trans.common.CONFIRM}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
