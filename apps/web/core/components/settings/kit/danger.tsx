'use client';

import { ReactNode, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AppDialog, APP_DIALOG_FOOTER } from '@/core/components/common/app-dialog';
import { DialogDescription, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { Alert, Spinner, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { SettingsRow } from './settings-page';

type DangerRowProps = {
	label: ReactNode;
	consequence: ReactNode;
	actionLabel: string;
	onAction: () => void;
	disabled?: boolean;
	'data-testid'?: string;
};

export function DangerRow({ label, consequence, actionLabel, onAction, disabled, ...rest }: Readonly<DangerRowProps>) {
	return (
		<SettingsRow label={label} description={consequence}>
			<Button
				type="button"
				variant="outline"
				onClick={onAction}
				disabled={disabled}
				data-testid={rest['data-testid']}
				className="text-destructive-ink hover:bg-destructive/[0.06]"
			>
				{actionLabel}
			</Button>
		</SettingsRow>
	);
}

export interface DangerConsequence {
	key: string;
	icon: ReactNode;
	text: ReactNode;
}

type ConfirmDestructiveDialogProps = {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: ReactNode;
	subject?: ReactNode;
	consequences?: DangerConsequence[];
	confirmationText?: string;
	confirmLabel: string;
	isPending: boolean;
	confirmDisabled?: boolean;
	error?: string | null;
	onConfirm: () => void;
	children?: ReactNode;
};

function isConfirmationTyped(expected: string | undefined, typed: string) {
	if (!expected) {
		return true;
	}
	return typed.trim() === expected.trim();
}

export function ConfirmDestructiveDialog({
	open,
	onClose,
	title,
	description,
	subject,
	consequences = [],
	confirmationText,
	confirmLabel,
	isPending,
	confirmDisabled = false,
	error,
	onConfirm,
	children
}: Readonly<ConfirmDestructiveDialogProps>) {
	const t = useTranslations();
	const fieldId = useId();
	const [typed, setTyped] = useState('');
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		setTyped('');
	}
	const hasConsequences = consequences.length > 0;
	const asksForTyping = Boolean(confirmationText);
	const isTyped = isConfirmationTyped(confirmationText, typed);
	const isReady = !isPending && !confirmDisabled;
	const canConfirm = isTyped && isReady;

	const close = () => {
		setTyped('');
		onClose();
	};

	return (
		<AppDialog open={open} onClose={close} width="sm">
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pt-5 pb-5">
				<div className="flex items-start justify-between gap-3">
					<span
						aria-hidden="true"
						className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-destructive/10 text-destructive-ink hairline-ring ring-destructive/20 [&_svg]:size-4.5"
					>
						<Alert />
					</span>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={close}
						aria-label={t('common.CLOSE')}
						className="-mt-1 -mr-2 text-muted-foreground"
					>
						<X />
					</Button>
				</div>
				<DialogTitle className="mt-3 text-[15px] font-semibold text-balance text-foreground">
					{title}
				</DialogTitle>
				{description && (
					<DialogDescription className="mt-1 text-[13px] text-pretty text-muted-foreground">
						{description}
					</DialogDescription>
				)}
				<div className="mt-4 flex flex-col gap-3">
					{subject}
					{hasConsequences && (
						<ul className="flex flex-col gap-2.5 rounded-xl bg-foreground/[0.03] px-3.5 py-3">
							{consequences.map((consequence) => (
								<li
									key={consequence.key}
									className="flex items-start gap-2.5 text-[13px] leading-5 text-foreground [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
								>
									{consequence.icon}
									<span className="min-w-0">{consequence.text}</span>
								</li>
							))}
						</ul>
					)}
					{children}
					{asksForTyping && (
						<div className="flex flex-col gap-1.5">
							<label htmlFor={fieldId} className="text-xs text-muted-foreground">
								{t('settings.common.TYPE_TO_CONFIRM', { text: confirmationText ?? '' })}
							</label>
							<Input
								id={fieldId}
								value={typed}
								onChange={(event) => setTyped(event.target.value)}
								autoComplete="off"
								spellCheck={false}
								className="h-8"
							/>
						</div>
					)}
				</div>
			</div>
			<div className={APP_DIALOG_FOOTER}>
				{error && (
					<p role="alert" className="mr-auto text-xs text-destructive-ink">
						{error}
					</p>
				)}
				<Button
					type="button"
					variant="ghost"
					onClick={close}
					disabled={isPending}
					data-initial-focus=""
					className={cn(!error && 'ml-auto')}
				>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" variant="destructive" onClick={onConfirm} disabled={!canConfirm}>
					{isPending && <Spinner className="size-3.5 animate-spin" />}
					{confirmLabel}
				</Button>
			</div>
		</AppDialog>
	);
}
