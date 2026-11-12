'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import { currencyKeyOf } from '@/core/lib/utils/dashboards/payments-due';
import {
	buildInvoiceRequest,
	defaultDueDayOf,
	invoiceCurrenciesOf,
	invoiceCurrencyKeyOf,
	invoicePeriodDaysOf,
	invoiceProblemsOf,
	keptLinesOf,
	overlappingInvoicesOf,
	parseInvoiceNumber,
	projectGroupsOf,
	removedLineCountOf,
	todayDayKey,
	type InvoiceGrouping,
	type InvoiceRequest
} from '@/core/lib/utils/invoices';
import { newUuid } from '@/core/lib/utils/uuid';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useCreateInvoice } from './use-invoice-mutations';
import { useInvoiceTime, type InvoiceTimeLabels } from './use-invoice-time';
import { useClientInvoices, useNextInvoiceNumber } from './use-invoices-query';

export const INVOICE_WEEK_START = 1;

const NO_KEYS: ReadonlySet<string> = new Set();

const NO_DESCRIPTIONS: ReadonlyMap<string, string> = new Map();

function numberTextOf(typedNumber: string | null, nextNumber: number | null) {
	if (typedNumber !== null) {
		return typedNumber;
	}
	if (nextNumber === null) {
		return '';
	}
	return String(nextNumber);
}

/** A new invoice while it is prepared. Nothing reaches the API until `save` is called. */
export function useNewInvoice() {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const organization = useAtomValue(currentOrganizationState);
	const clientsQuery = useActiveClients();
	const clients = clientsQuery.clients;

	const [pickedClientId, setPickedClientId] = useState<string | null>(() => searchParams?.get('client') ?? null);
	const [period, setPeriod] = useState<Period>(() => periodOfPreset('lastMonth', INVOICE_WEEK_START));
	const [grouping, setGrouping] = useState<InvoiceGrouping>('member');
	const [removedKeys, setRemovedKeys] = useState<ReadonlySet<string>>(NO_KEYS);
	const [descriptions, setDescriptions] = useState<ReadonlyMap<string, string>>(NO_DESCRIPTIONS);
	const [pickedCurrencyKey, setPickedCurrencyKey] = useState<string | null>(null);
	const [typedNumber, setTypedNumber] = useState<string | null>(null);
	const [issueDay, setIssueDay] = useState(() => todayDayKey());
	const [pickedDueDay, setPickedDueDay] = useState<string | null>(null);

	const client = useMemo(
		() => clients.find((candidate) => candidate.id === pickedClientId) ?? null,
		[clients, pickedClientId]
	);
	const clientId = client?.id ?? null;

	const labels = useMemo<InvoiceTimeLabels>(
		() => ({
			unnamedProject: t('invoices.new.UNNAMED_PROJECT'),
			unnamedMember: t('timeActivity.UNNAMED_EMPLOYEE'),
			noTask: t('invoices.new.NO_TASK')
		}),
		[t]
	);
	const time = useInvoiceTime({ clientId, period, grouping, labels });

	const currencies = useMemo(() => invoiceCurrenciesOf(time.lines), [time.lines]);
	const currencyKey = invoiceCurrencyKeyOf(currencies, pickedCurrencyKey);
	const currencyTotal = currencies.find((total) => total.key === currencyKey);
	const currency = currencyTotal?.currency ?? null;
	const otherCurrencies = useMemo(
		() => currencies.filter((total) => total.key !== currencyKey),
		[currencies, currencyKey]
	);

	const invoiceLines = useMemo(
		() => time.lines.filter((line) => currencyKeyOf(line.currency) === currencyKey),
		[currencyKey, time.lines]
	);
	const keptLines = useMemo(() => keptLinesOf(invoiceLines, removedKeys), [invoiceLines, removedKeys]);
	const groups = useMemo(() => projectGroupsOf(keptLines), [keptLines]);
	const keptTotal = useMemo(() => invoiceCurrenciesOf(keptLines)[0], [keptLines]);
	const removedCount = removedLineCountOf(invoiceLines, removedKeys);

	const nextNumber = useNextInvoiceNumber(true);
	const numberText = numberTextOf(typedNumber, nextNumber.nextNumber);
	const dueDay = pickedDueDay ?? defaultDueDayOf(issueDay, organization?.daysUntilDue);

	const periodDays = useMemo(() => invoicePeriodDaysOf(period), [period]);
	const earlier = useClientInvoices(clientId);
	const overlappingInvoices = useMemo(
		() => overlappingInvoicesOf(earlier.invoices, periodDays),
		[earlier.invoices, periodDays]
	);

	const problems = invoiceProblemsOf({ numberText, issueDay, dueDay, currency, lineCount: keptLines.length });

	const resetEdits = useCallback(() => {
		setRemovedKeys(NO_KEYS);
		setDescriptions(NO_DESCRIPTIONS);
		setPickedCurrencyKey(null);
	}, []);

	const changeClient = useCallback(
		(nextClientId: string) => {
			setPickedClientId(nextClientId || null);
			resetEdits();
		},
		[resetEdits]
	);

	const changePeriod = useCallback(
		(nextPeriod: Period) => {
			setPeriod(nextPeriod);
			resetEdits();
		},
		[resetEdits]
	);

	const changeGrouping = useCallback(
		(nextGrouping: InvoiceGrouping) => {
			setGrouping(nextGrouping);
			resetEdits();
		},
		[resetEdits]
	);

	const removeLine = useCallback((lineKey: string) => {
		setRemovedKeys((current) => new Set([...current, lineKey]));
	}, []);

	const restoreLines = useCallback(() => setRemovedKeys(NO_KEYS), []);

	const describeLine = useCallback((lineKey: string, description: string) => {
		setDescriptions((current) => new Map([...current, [lineKey, description]]));
	}, []);

	const timeZone = organization?.timeZone;
	const invoiceRequest = useCallback((): InvoiceRequest | null => {
		const invoiceNumber = parseInvoiceNumber(numberText);
		if (problems.length > 0 || invoiceNumber === null) {
			return null;
		}
		if (!clientId || !currency) {
			return null;
		}
		return buildInvoiceRequest({
			id: newUuid(),
			organizationId: getOrganizationIdCookie(),
			tenantId: getTenantIdCookie(),
			clientId,
			invoiceNumber,
			issueDay,
			dueDay,
			currency,
			period: periodDays,
			timeZone,
			lines: keptLines,
			descriptions
		});
	}, [
		clientId,
		currency,
		descriptions,
		dueDay,
		issueDay,
		keptLines,
		numberText,
		periodDays,
		problems.length,
		timeZone
	]);

	const { createInvoice, isSaving } = useCreateInvoice();
	const refetchNextNumber = nextNumber.refetch;
	const save = useCallback(async () => {
		const request = invoiceRequest();
		if (!request) {
			return null;
		}
		try {
			return await createInvoice(request);
		} catch (error) {
			// The number is the likeliest refusal (another invoice took it): the form shows the highest again.
			void refetchNextNumber();
			throw error;
		}
	}, [createInvoice, invoiceRequest, refetchNextNumber]);

	return {
		organizationName: organization?.name ?? '',
		timeZone,
		clients,
		areClientsLoading: clientsQuery.isLoading,
		haveClientsFailed: clientsQuery.isError,
		refetchClients: clientsQuery.refetch,
		client,
		changeClient,
		period,
		periodDays,
		changePeriod,
		grouping,
		changeGrouping,
		time,
		currencies,
		currencyKey,
		currency,
		changeCurrency: setPickedCurrencyKey,
		otherCurrencies,
		groups,
		keptLines,
		keptHours: keptTotal?.hours ?? 0,
		total: keptTotal?.amount ?? 0,
		removedCount,
		removeLine,
		restoreLines,
		descriptions,
		describeLine,
		numberText,
		setNumberText: setTypedNumber,
		nextNumber: nextNumber.nextNumber,
		isNumberLoading: nextNumber.isLoading,
		hasNumberFailed: nextNumber.isError,
		issueDay,
		setIssueDay,
		dueDay,
		setDueDay: setPickedDueDay,
		earlierInvoices: earlier.invoices,
		areEarlierLoading: earlier.isLoading,
		haveEarlierFailed: earlier.isError,
		overlappingInvoices,
		problems,
		save,
		isSaving
	};
}

export type NewInvoiceState = ReturnType<typeof useNewInvoice>;
