'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import { currencyKeyOf } from '@/core/lib/utils/dashboards/payments-due';
import {
	buildInvoiceRequest,
	dueDayAfter,
	invoiceCurrenciesOf,
	invoiceCurrencyKeyOf,
	invoiceDueTermOf,
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
import {
	acceptsPercentText,
	hasAdjustments,
	invoiceTotalsOf,
	percentOfText,
	type InvoiceAdjustments
} from '@/core/lib/utils/invoice-totals';
import { newUuid } from '@/core/lib/utils/uuid';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { useCreateInvoice, useSaveAndSendInvoice } from './use-invoice-mutations';
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
	const organizationRead = useCurrentOrganizationOwner();
	const organization = useAtomValue(currentOrganizationState);
	const isOrganizationKnown = organization !== null;
	const hasOrganizationFailed = !isOrganizationKnown && organizationRead.isError;
	const isOrganizationLoading = !isOrganizationKnown && !organizationRead.isError;
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
	const [typedNote, setTypedNote] = useState<string | null>(null);
	const [discountText, setDiscountText] = useState('');
	const [taxText, setTaxText] = useState('');

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
	const subtotal = keptTotal?.amount ?? 0;
	const adjustments = useMemo<InvoiceAdjustments>(
		() => ({ discountPercent: percentOfText(discountText), taxPercent: percentOfText(taxText) }),
		[discountText, taxText]
	);
	const totals = useMemo(() => invoiceTotalsOf(subtotal, adjustments), [adjustments, subtotal]);

	const nextNumber = useNextInvoiceNumber(true);
	const numberText = numberTextOf(typedNumber, nextNumber.nextNumber);
	const dueTerm = invoiceDueTermOf(client?.paymentTermsDays, organization?.daysUntilDue);
	const termDueDay = dueDayAfter(issueDay, dueTerm.days);
	const dueDay = pickedDueDay ?? termDueDay;
	const isDueDayOfTerm = dueDay !== '' && dueDay === termDueDay;
	const note = typedNote ?? organization?.defaultInvoiceEstimateTerms ?? '';

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
			// The due day follows the terms of the client the invoice is for.
			setPickedDueDay(null);
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

	const changeDiscount = useCallback((text: string) => {
		if (acceptsPercentText(text)) {
			setDiscountText(text);
		}
	}, []);

	const changeTax = useCallback((text: string) => {
		if (acceptsPercentText(text)) {
			setTaxText(text);
		}
	}, []);

	const timeZone = organization?.timeZone;
	const invoiceRequest = useCallback((): InvoiceRequest | null => {
		// The organisation's time zone dates the invoice: before it is read, the days would be the browser's.
		if (!isOrganizationKnown) {
			return null;
		}
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
			descriptions,
			note,
			adjustments
		});
	}, [
		adjustments,
		clientId,
		currency,
		descriptions,
		dueDay,
		isOrganizationKnown,
		issueDay,
		keptLines,
		note,
		numberText,
		periodDays,
		problems.length,
		timeZone
	]);

	const { createInvoice, isSaving: isCreating } = useCreateInvoice();
	const { saveAndSendInvoice, isSavingAndSending } = useSaveAndSendInvoice();
	const isSaving = isCreating || isSavingAndSending;
	const refetchNextNumber = nextNumber.refetch;
	const submit = useCallback(
		async <T>(run: (request: InvoiceRequest) => Promise<T>): Promise<T | null> => {
			const request = invoiceRequest();
			if (!request) {
				return null;
			}
			try {
				return await run(request);
			} catch (error) {
				// The number is the likeliest refusal (another invoice took it): the form shows the highest again.
				void refetchNextNumber();
				throw error;
			}
		},
		[invoiceRequest, refetchNextNumber]
	);

	const save = useCallback(() => submit(createInvoice), [createInvoice, submit]);

	const saveAndSend = useCallback(
		(email: string) => submit((request) => saveAndSendInvoice({ request, email })),
		[saveAndSendInvoice, submit]
	);

	return {
		organizationName: organization?.name ?? '',
		isOrganizationLoading,
		hasOrganizationFailed,
		refetchOrganization: organizationRead.refetch,
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
		/** What the invoice asks for: its lines, less the discount, plus the tax. */
		total: totals.total,
		totals,
		adjustments,
		discountText,
		changeDiscount,
		taxText,
		changeTax,
		hasAdjustments: hasAdjustments(adjustments),
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
		dueTerm,
		isDueDayOfTerm,
		note,
		setNote: setTypedNote,
		earlierInvoices: earlier.invoices,
		areEarlierLoading: earlier.isLoading,
		haveEarlierFailed: earlier.isError,
		overlappingInvoices,
		problems,
		save,
		saveAndSend,
		isSaving
	};
}

export type NewInvoiceState = ReturnType<typeof useNewInvoice>;
