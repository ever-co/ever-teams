import { useTeamInvitations } from '@app/hooks';
import { AxiosError } from 'axios';
import {
	BackButton,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useState } from 'react';

export function InviteFormModal({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) {
	const { trans, translations } = useTranslation('invite');
	const { invateUser, inviteLoading } = useTeamInvitations();
	const [errors, setErrors] = useState({});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		const form = new FormData(e.currentTarget);

		invateUser(
			form.get('email')?.toString() || '',
			form.get('name')?.toString() || ''
		)
			.then(() => {
				closeModal();

				e.currentTarget.reset();
			})
			.catch((err: AxiosError) => {
				if (err.response?.status === 400) {
					setErrors((err.response?.data as any)?.errors || {});
				}
			});
	};

	return (
		<Modal isOpen={open} closeModal={() => undefined}>
			<form
				className="w-[98%] md:w-[530px]"
				autoComplete="off"
				onSubmit={handleSubmit}
			>
				<Card className="w-full" shadow="custom">
					<div className="flex flex-col justify-between items-center">
						<div className="mb-7">
							<Text.Heading as="h3" className="text-center mb-3">
								{trans.HEADING_TITLE}
							</Text.Heading>

							<Text className="text-center text-gray-500 text-sm">
								{trans.HEADING_DESCRIPTION}
							</Text>
						</div>

						<div className="w-full">
							<InputField
								type="email"
								name="email"
								placeholder={translations.form.TEAM_MEMBER_EMAIL_PLACEHOLDER}
								errors={errors}
								setErrors={setErrors}
								required
							/>
						</div>

						<div className="w-full mt-1">
							<InputField
								type="text"
								name="name"
								placeholder={translations.form.TEAM_MEMBER_NAME_PLACEHOLDER}
								errors={errors}
								setErrors={setErrors}
								required
							/>
						</div>

						<div className="w-full flex justify-between mt-3 items-center">
							<BackButton onClick={closeModal} />

							<Button
								type="submit"
								disabled={inviteLoading}
								loading={inviteLoading}
							>
								{trans.SEND_INVITE}
							</Button>
						</div>
					</div>
				</Card>
			</form>
		</Modal>
	);
}
