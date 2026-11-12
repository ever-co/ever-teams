'use client';

import { useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { ConfirmDestructiveDialog, type DangerConsequence } from '@/core/components/settings/kit/danger';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { MemberAvatar, PersonLines } from './people-parts';

export function ConfirmMemberDialog({
	member,
	titleOf,
	consequencesOf,
	confirmLabel,
	confirmDisabled = false,
	onClose,
	onConfirm
}: Readonly<{
	member: MemberRowModel | null;
	titleOf: (name: string) => string;
	consequencesOf: (name: string) => DangerConsequence[];
	confirmLabel: string;
	confirmDisabled?: boolean;
	onClose: () => void;
	onConfirm: (rowId: string) => Promise<void>;
}>) {
	const t = useTranslations();
	const [shown, setShown] = useState<MemberRowModel | null>(member);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Keep the last member on screen while the dialog plays its closing transition
	if (member && member !== shown) {
		setShown(member);
	}
	const isOpen = Boolean(member);
	const name = shown?.name ?? '';

	const close = () => {
		// The request cannot be taken back, and its answer would land on whichever member's dialog is open by then
		if (isPending) {
			return;
		}
		setError(null);
		onClose();
	};

	const confirm = async () => {
		if (!shown) {
			return;
		}
		setIsPending(true);
		setError(null);
		try {
			await onConfirm(shown.id);
			onClose();
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsPending(false);
		}
	};

	const subject = shown && (
		<div className="flex items-center gap-3 rounded-xl px-1">
			<MemberAvatar name={shown.name} imageUrl={shown.imageUrl} />
			<PersonLines name={shown.name} detail={shown.email} />
		</div>
	);

	return (
		<ConfirmDestructiveDialog
			open={isOpen}
			onClose={close}
			title={titleOf(name)}
			subject={subject}
			consequences={consequencesOf(name)}
			confirmLabel={confirmLabel}
			isPending={isPending}
			confirmDisabled={confirmDisabled}
			error={error}
			onConfirm={() => {
				void confirm();
			}}
		/>
	);
}
