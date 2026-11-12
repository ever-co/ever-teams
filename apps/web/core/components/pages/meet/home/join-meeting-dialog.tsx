'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AppDialog, AppDialogHeader, APP_DIALOG_BODY, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { meetingPathOfInput } from '@/core/lib/utils/meetings';

interface JoinMeetingDialogProps {
	open: boolean;
	onClose: () => void;
	isJitsi: boolean;
}

/** Joins a meeting from a link someone shared, or from the name of its room. */
export function JoinMeetingDialog({ open, onClose, isJitsi }: Readonly<JoinMeetingDialogProps>) {
	const t = useTranslations();
	const router = useRouter();
	const [input, setInput] = useState('');
	const [isInvalid, setIsInvalid] = useState(false);

	const close = () => {
		setInput('');
		setIsInvalid(false);
		onClose();
	};

	const join = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const path = meetingPathOfInput(input, isJitsi);
		if (!path) {
			setIsInvalid(true);
			return;
		}
		close();
		router.push(path);
	};

	return (
		<AppDialog open={open} onClose={close} width="sm">
			<AppDialogHeader title={t('meetings.JOIN_TITLE')} onClose={close} />
			<form onSubmit={join} noValidate className="contents">
				<div className={`${APP_DIALOG_BODY} flex flex-col gap-2 pb-4`}>
					<label htmlFor="meeting-join-input" className="text-sm font-medium text-foreground">
						{t('meetings.JOIN_LABEL')}
					</label>
					<Input
						id="meeting-join-input"
						data-initial-focus
						autoComplete="off"
						value={input}
						placeholder={t('meetings.JOIN_PLACEHOLDER')}
						aria-invalid={isInvalid || undefined}
						aria-describedby={isInvalid ? 'meeting-join-error' : undefined}
						onChange={(event) => {
							setInput(event.target.value);
							setIsInvalid(false);
						}}
					/>
					{isInvalid && (
						<p id="meeting-join-error" role="alert" className="text-xs text-destructive-ink">
							{t('meetings.JOIN_INVALID')}
						</p>
					)}
				</div>
				<div className={`${APP_DIALOG_FOOTER} justify-end`}>
					<Button type="button" variant="ghost" onClick={close}>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" disabled={!input.trim()}>
						{t('meetings.JOIN')}
					</Button>
				</div>
			</form>
		</AppDialog>
	);
}
