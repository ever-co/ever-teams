'use client';

import { useId, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Input } from '@/core/components/common/input';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Copy } from '@/core/components/icons';
import {
	SETTINGS_ROW_DESCRIPTION,
	SETTINGS_ROW_LABEL,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { invoicePaymentConnectionService } from '@/core/services/client/api/organizations/invoice-payment-connection.service';
import type { TInvoicePaymentConnection } from '@/core/types/schemas/organization/shared-invoice.schema';

const CONNECTION_QUERY_KEY = ['invoice-payment-connection'] as const;

/**
 * An answer that hides the section: a refusal for want of the payment permissions (not the member's to see), or a 404
 * from an API that does not serve online invoice payments (a Gauzy without ever-co/ever-gauzy#11856, or without its
 * payment plugin), where there is nothing to connect.
 */
const hidesSection = (error: unknown) => {
	const status = errorStatusOf(error);
	return status === 401 || status === 403 || status === 404;
};

function CopyRow({ label, hint, value }: Readonly<{ label: string; hint?: string; value: string }>) {
	const t = useTranslations();
	const id = useId();
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(t('invoices.payments.COPIED'));
		} catch {
			toast.error(t('settings.security.COPY_FAILED'));
		}
	};
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className={SETTINGS_ROW_LABEL}>
				{label}
			</label>
			<div className="flex min-w-0 items-center gap-2">
				<Input id={id} value={value} readOnly className="min-w-0 flex-1 font-mono text-xs" dir="ltr" />
				<Button
					type="button"
					variant="outline"
					onClick={() => void copy()}
					aria-label={t('invoices.payments.COPY')}
				>
					<Copy className="size-4" aria-hidden="true" />
					<span className="hidden sm:inline">{t('invoices.payments.COPY')}</span>
				</Button>
			</div>
			{hint && <p className={SETTINGS_ROW_DESCRIPTION}>{hint}</p>}
		</div>
	);
}

/**
 * Settings › Integrations: the workspace's connection to the payment connector through which clients pay an invoice
 * from its public page (ever-co/ever-gauzy#11856). Shown to members the API lets read the payment providers; the
 * signing secret is shown once, when the connection is made or its secret rotated.
 */
export function InvoicePaymentsSection() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const endpointId = useId();
	const connection = useQuery({
		queryKey: CONNECTION_QUERY_KEY,
		queryFn: invoicePaymentConnectionService.getConnection,
		retry: (count, error) => !hidesSection(error) && count < 2
	});
	const [endpoint, setEndpoint] = useState('');
	const [isEnabled, setIsEnabled] = useState(true);
	const [isTestMode, setIsTestMode] = useState(false);
	const [secret, setSecret] = useState<string | null>(null);
	// The form shows the connection as the API last answered it: read anew, or written by this form
	const [shownConnection, setShownConnection] = useState<TInvoicePaymentConnection | undefined>(undefined);
	if (connection.data !== shownConnection) {
		setShownConnection(connection.data);
		if (connection.data?.connected) {
			setEndpoint(connection.data.checkoutEndpoint ?? '');
			setIsEnabled(connection.data.isEnabled);
			setIsTestMode(connection.data.isTestMode);
		}
	}

	const remember = (answer: TInvoicePaymentConnection) => {
		const { signingSecret, ...shown } = answer;
		queryClient.setQueryData(CONNECTION_QUERY_KEY, shown);
		if (signingSecret) {
			setSecret(signingSecret);
		}
	};
	const save = useMutation({
		mutationFn: () =>
			invoicePaymentConnectionService.connect({ checkoutEndpoint: endpoint.trim(), isEnabled, isTestMode }),
		onSuccess: (answer) => {
			remember(answer);
			toast.success(t('invoices.payments.SAVED'));
		},
		onError: () => toast.error(t('invoices.payments.SAVE_FAILED'))
	});
	const rotate = useMutation({
		mutationFn: invoicePaymentConnectionService.rotateSecret,
		onSuccess: remember,
		onError: () => toast.error(t('invoices.payments.SAVE_FAILED'))
	});

	if (connection.isError && hidesSection(connection.error)) {
		return null;
	}

	const isConnected = Boolean(connection.data?.connected);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		save.mutate();
	};

	return (
		<SettingsSection
			id="invoice-payments"
			title={t('invoices.payments.TITLE')}
			description={t('invoices.payments.DESCRIPTION')}
		>
			<SettingsSurface className="flex flex-col gap-5 p-4">
				{connection.isError && <Notice tone="error" title={t('invoices.payments.LOAD_FAILED')} />}
				<form className="flex flex-col gap-5" onSubmit={submit}>
					<div className="flex flex-col gap-1.5">
						<label htmlFor={endpointId} className={SETTINGS_ROW_LABEL}>
							{t('invoices.payments.ENDPOINT')}
						</label>
						<Input
							id={endpointId}
							type="url"
							inputMode="url"
							dir="ltr"
							required
							placeholder="https://"
							value={endpoint}
							onChange={(event) => setEndpoint(event.target.value)}
							disabled={connection.isPending}
						/>
						<p className={SETTINGS_ROW_DESCRIPTION}>{t('invoices.payments.ENDPOINT_HINT')}</p>
					</div>
					<div className="flex items-center justify-between gap-4">
						<span className={SETTINGS_ROW_LABEL}>{t('invoices.payments.ENABLED')}</span>
						<SettingsSwitch
							checked={isEnabled}
							onCheckedChange={setIsEnabled}
							ariaLabel={t('invoices.payments.ENABLED')}
						/>
					</div>
					<div className="flex items-center justify-between gap-4">
						<span className={SETTINGS_ROW_LABEL}>{t('invoices.payments.TEST_MODE')}</span>
						<SettingsSwitch
							checked={isTestMode}
							onCheckedChange={setIsTestMode}
							ariaLabel={t('invoices.payments.TEST_MODE')}
						/>
					</div>
					<div className="flex justify-end">
						<Button type="submit" disabled={save.isPending || connection.isPending || !endpoint.trim()}>
							{isConnected ? t('invoices.payments.SAVE') : t('invoices.payments.CONNECT')}
						</Button>
					</div>
				</form>
				{isConnected && connection.data?.notificationUrl && (
					<CopyRow
						label={t('invoices.payments.NOTIFICATION_URL')}
						hint={t('invoices.payments.NOTIFICATION_URL_HINT')}
						value={connection.data.notificationUrl}
					/>
				)}
				{secret && (
					<div className="flex flex-col gap-3">
						<Notice
							tone="warning"
							title={t('invoices.payments.SECRET')}
							description={t('invoices.payments.SECRET_ONCE')}
						/>
						<CopyRow label={t('invoices.payments.SECRET')} value={secret} />
					</div>
				)}
				{isConnected && (
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
						<p className={SETTINGS_ROW_DESCRIPTION}>{t('invoices.payments.ROTATE_HINT')}</p>
						<Button
							type="button"
							variant="outline"
							disabled={rotate.isPending}
							onClick={() => rotate.mutate()}
						>
							{t('invoices.payments.ROTATE')}
						</Button>
					</div>
				)}
			</SettingsSurface>
		</SettingsSection>
	);
}
