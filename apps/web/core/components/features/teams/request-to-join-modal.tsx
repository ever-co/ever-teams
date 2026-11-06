'use client';

import { useAuthenticationPasscode } from '@/core/hooks';
import { useResendCooldown } from '@/core/hooks/auth/use-resend-cooldown';
import { useRequestToJoinMutation } from '@/core/hooks/organizations/teams/use-request-to-join-mutation';
import { useValidateRequestToJoin } from '@/core/hooks/organizations/teams/use-validate-request-to-join';
import { useResendCodeRequestToJoin } from '@/core/hooks/organizations/teams/use-resend-code-request-to-join';
import { clsxm } from '@/core/lib/utils';
import {
	Button,
	Modal,
	SpinnerLoader,
	Text,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { useCallback, useState } from 'react';
import { useActiveIndicator, type IndicatorBox } from '@/core/hooks/common/use-active-indicator';
import { useTranslations } from 'next-intl';

import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { AUTH_CODE_CONTAINER_CLASS, AUTH_CODE_SLOT_CLASS } from '@/core/components/auth/auth-code-recipe';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { InputField } from '@/core/components/duplicated-components/_input';
import { PositionDropDown } from '../../layouts/default-layout/header/position-dropdown';
import { TJoinTeamRequest } from '@/core/types/schemas';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';

const TAB_CLASS_NAME =
	'relative flex h-9 cursor-pointer items-center text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/25';
const ACTIVE_TAB_CLASS_NAME = 'font-medium text-foreground hover:text-foreground';

function tabIndicatorStyle(box: IndicatorBox) {
	return { transform: `translateX(${box.left}px)`, width: box.width };
}

export const RequestToJoinModal = ({ open, closeModal }: { open: boolean; closeModal: () => void }) => {
	const [currentTab, setCurrentTab] = useState<'ALREADY_MEMBER' | 'BECOME_MEMBER'>('ALREADY_MEMBER');
	// Held here so switching tabs, which unmounts AlreadyMember, does not end the wait
	const resendCooldown = useResendCooldown();
	const { listRef, activeRef, box } = useActiveIndicator<HTMLDivElement, HTMLButtonElement>(currentTab);
	const activeTeam = useAtomValue(activeTeamState);

	const t = useTranslations();
	const isAlreadyMemberTab = currentTab === 'ALREADY_MEMBER';
	const isBecomeMemberTab = currentTab === 'BECOME_MEMBER';
	const alreadyMemberTabRef = isAlreadyMemberTab && activeRef;
	const becomeMemberTabRef = isBecomeMemberTab && activeRef;

	return (
		<Modal isOpen={open} closeModal={closeModal} title={t('common.JOIN_REQUEST')} breadcrumb={activeTeam?.name}>
			<div className="flex w-full flex-col sm:w-md">
				<div ref={listRef} role="tablist" className="relative flex items-end gap-5 hairline-b border-border">
					<button
						type="button"
						role="tab"
						aria-selected={isAlreadyMemberTab}
						ref={alreadyMemberTabRef || undefined}
						className={clsxm(TAB_CLASS_NAME, isAlreadyMemberTab && ACTIVE_TAB_CLASS_NAME)}
						onClick={() => {
							setCurrentTab('ALREADY_MEMBER');
						}}
					>
						{t('common.EXISTING_MEMBER')}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={isBecomeMemberTab}
						ref={becomeMemberTabRef || undefined}
						className={clsxm(TAB_CLASS_NAME, isBecomeMemberTab && ACTIVE_TAB_CLASS_NAME)}
						onClick={() => {
							setCurrentTab('BECOME_MEMBER');
						}}
					>
						{t('common.NEW_MEMBER')}
					</button>
					{box && (
						<span
							aria-hidden="true"
							style={tabIndicatorStyle(box)}
							className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-t-full bg-primary transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
						/>
					)}
				</div>

				{isAlreadyMemberTab && <AlreadyMember closeModal={closeModal} resendCooldown={resendCooldown} />}
				{isBecomeMemberTab && <BecomeMember closeModal={closeModal} />}
			</div>
		</Modal>
	);
};

const AlreadyMember = ({
	closeModal,
	resendCooldown
}: {
	closeModal: any;
	resendCooldown: ReturnType<typeof useResendCooldown>;
}) => {
	const t = useTranslations();
	const {
		loading,
		formValues,
		setFormValues,
		errors,
		handleChange,
		handleCodeSubmit,
		signInEmailLoading,
		sendAuthCodeHandler,
		inputCodeRef
	} = useAuthenticationPasscode();

	// Only a code that went out starts the wait; the hook already shows the error of a failed send
	const resendCode = () => sendAuthCodeHandler()?.then(resendCooldown.start, () => undefined);

	return (
		<form autoComplete="off" onSubmit={handleCodeSubmit} className="flex flex-col gap-5 pt-6">
			<InputField
				type="email"
				placeholder={t('form.EMAIL_PLACEHOLDER')}
				className="m-0"
				wrapperClassName="mb-0"
				name="email"
				value={formValues.email}
				onChange={handleChange}
				errors={errors}
				required
			/>
			<div className="flex w-full flex-col gap-2.5">
				<p className={modalFieldLabelClass}>{t('pages.auth.INPUT_INVITE_CODE')}</p>
				<AuthCodeInputField
					allowedCharacters="alphanumeric"
					length={AUTH_CODE_LENGTH}
					ref={inputCodeRef}
					containerClassName={AUTH_CODE_CONTAINER_CLASS}
					inputClassName={AUTH_CODE_SLOT_CLASS}
					defaultValue={formValues.code}
					onChange={(code) => {
						setFormValues((v) => ({ ...v, code }));
					}}
				/>
				{errors['code'] && <Text.Error className="justify-self-start self-start">{errors['code']}</Text.Error>}
			</div>
			<div className="flex w-full items-center justify-between">
				<div className="flex flex-col items-start">
					<div className="text-xs font-normal text-muted-foreground">
						{t('pages.auth.UNRECEIVED_CODE')}
						{!signInEmailLoading && (
							<button
								type="button"
								className="text-xs font-normal text-muted-foreground"
								onClick={resendCode}
								disabled={resendCooldown.locked}
							>
								{resendCooldown.locked &&
									`${t('pages.auth.RESEND_CODE_IN')} ${resendCooldown.countdown}`}
								{!resendCooldown.locked && (
									<span className="text-primary-ink">{t('pages.auth.RESEND_CODE')}</span>
								)}
							</button>
						)}
						{signInEmailLoading && <SpinnerLoader size={22} className="self-center" />}
					</div>
				</div>
			</div>

			<div className={modalFooterClass}>
				<Button
					type="button"
					variant="ghost"
					size="default"
					className={modalSecondaryActionClass}
					onClick={closeModal}
				>
					{t('common.CANCEL')}
				</Button>
				<Button
					type="submit"
					size="default"
					className={modalPrimaryActionClass}
					loading={loading}
					disabled={loading || formValues.code.length !== AUTH_CODE_LENGTH}
				>
					{t('pages.auth.JOIN')}
				</Button>
			</div>
		</form>
	);
};
const BecomeMember = ({ closeModal }: { closeModal: any }) => {
	const [joinButtonAction, setJoinButtonAction] = useState<'JOIN' | 'CONFIRM'>('JOIN');
	const [requestToJoinPayload, setRequestToJoinPayload] = useState<TJoinTeamRequest | null>(null);
	const [position, setPosition] = useState<string>('');

	const t = useTranslations();
	const { formValues, setFormValues, errors, setErrors, sendCodeLoading, inputCodeRef } = useAuthenticationPasscode();

	const activeTeam = useAtomValue(activeTeamState);
	const { requestToJoinTeam, requestToJoinLoading } = useRequestToJoinMutation();
	const { validateRequestToJoinTeam, validateRequestToJoinLoading } = useValidateRequestToJoin();
	const { resendCodeRequestToJoinTeam, resendCodeRequestToJoinLoading } = useResendCodeRequestToJoin();
	const [message, setMessage] = useState<string>('');

	const handleSubmitRequest = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!activeTeam || !position) {
				return;
			}

			const form = new FormData(e.currentTarget);

			const payload = {
				fullName: form.get('fullName') as string,
				email: form.get('email') as string,
				linkAddress: form.get('linkAddress') as string,
				position,
				organizationTeamId: activeTeam.id
			};

			if (joinButtonAction === 'JOIN') {
				requestToJoinTeam(payload).then(() => {
					setJoinButtonAction('CONFIRM');
					setMessage(t('pages.home.SENT_EMAIL_VERIFICATION'));
				});
				setRequestToJoinPayload(payload);
			} else {
				if (requestToJoinPayload) {
					validateRequestToJoinTeam({
						email: requestToJoinPayload.email,
						organizationTeamId: requestToJoinPayload.organizationTeamId,
						code: formValues.code
					}).then((res) => {
						if (res.email && res.organizationTeamId) {
							closeModal();
						}
						setErrors({
							code: t('errors.ERROR_WHILE_VERIFY_CODE')
						});
					});
				}
			}
		},
		[
			activeTeam,
			position,
			joinButtonAction,
			requestToJoinTeam,
			t,
			requestToJoinPayload,
			validateRequestToJoinTeam,
			formValues.code,
			setErrors,
			closeModal
		]
	);

	const handleResendCodeRequestToJoinTeam = useCallback(() => {
		if (requestToJoinPayload) {
			resendCodeRequestToJoinTeam(requestToJoinPayload);
		}
	}, [requestToJoinPayload, resendCodeRequestToJoinTeam]);

	const isConfirmStep = joinButtonAction === 'CONFIRM';
	let submitLabel = t('common.CONFIRM');
	if (joinButtonAction === 'JOIN') {
		submitLabel = t('common.JOIN_REQUEST');
	}

	return (
		<form autoComplete="off" onSubmit={handleSubmitRequest} className="flex flex-col gap-5 pt-6">
			<div className="flex w-full flex-col gap-3">
				<InputField
					type="text"
					placeholder={t('modals.requestToJoin.namePlaceholder')}
					name="fullName"
					className="m-0"
					wrapperClassName="mb-0"
					required
					disabled={isConfirmStep}
				/>
				<InputField
					type="email"
					placeholder={t('modals.requestToJoin.emailPlaceholder')}
					className="m-0"
					wrapperClassName="mb-0"
					name="email"
					required
					disabled={isConfirmStep}
				/>

				<InputField
					type="url"
					placeholder={t('modals.requestToJoin.linkPlaceholder')}
					className="m-0"
					wrapperClassName="mb-0"
					name="linkAddress"
					required
					disabled={isConfirmStep}
				/>
				<PositionDropDown currentPosition={position} onChangePosition={setPosition} disabled={isConfirmStep} />

				{message && <Text.Error className="justify-self-start self-start">{message}</Text.Error>}
			</div>

			{isConfirmStep && (
				<>
					<div className="flex w-full flex-col gap-2.5">
						<p className={modalFieldLabelClass}>{t('pages.auth.INPUT_INVITE_CODE')}</p>
						<AuthCodeInputField
							allowedCharacters="alphanumeric"
							length={AUTH_CODE_LENGTH}
							ref={inputCodeRef}
							containerClassName={AUTH_CODE_CONTAINER_CLASS}
							inputClassName={AUTH_CODE_SLOT_CLASS}
							defaultValue={formValues.code}
							onChange={(code) => {
								setFormValues((v) => ({ ...v, code }));
							}}
						/>
						{errors['code'] && (
							<Text.Error className="justify-self-start self-start">{errors['code']}</Text.Error>
						)}
					</div>
					<div className="flex w-full items-center justify-between">
						<div className="flex flex-col items-start">
							<div className="text-xs font-normal text-muted-foreground">
								{t('pages.auth.UNRECEIVED_CODE')}
								{!sendCodeLoading && (
									<button
										type="button"
										className="text-xs font-normal text-muted-foreground"
										onClick={handleResendCodeRequestToJoinTeam}
									>
										<span className="text-primary-ink">{t('pages.auth.RESEND_CODE')}</span>
									</button>
								)}
								{sendCodeLoading ||
									(resendCodeRequestToJoinLoading && (
										<SpinnerLoader size={22} className="self-center" />
									))}
							</div>
						</div>
					</div>
				</>
			)}

			<div className={modalFooterClass}>
				<Button
					type="button"
					variant="ghost"
					size="default"
					className={modalSecondaryActionClass}
					onClick={closeModal}
				>
					{t('common.CANCEL')}
				</Button>
				<Button
					type="submit"
					size="default"
					className={modalPrimaryActionClass}
					loading={requestToJoinLoading || validateRequestToJoinLoading}
					disabled={
						requestToJoinLoading ||
						validateRequestToJoinLoading ||
						(joinButtonAction === 'CONFIRM' && formValues.code.length !== AUTH_CODE_LENGTH)
					}
				>
					{submitLabel}
				</Button>
			</div>
		</form>
	);
};
