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
	invoiceSaveFailureOf,
	invoiceWaitsOf,
	keptLinesOf,
	overlappingInvoicesOf,
	parseInvoiceNumber,
	projectGroupsOf,
	removedLineCountOf,
	todayDayKey,
	type InvoiceGrouping,
	type InvoiceRequest,
	type NamedInvoiceLine
} from '@/core/lib/utils/invoices';
import { percentTextOf, periodOfDays, type SavedInvoice } from '@/core/lib/utils/invoice-edit';
import {
	acceptsPercentText,
	hasAdjustments,
	invoiceTotalsOf,
	percentOfText,
	type InvoiceAdjustments
} from '@/core/lib/utils/invoice-totals';
import { newUuid } from '@/core/lib/utils/uuid';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TClient } from '@/core/types/schemas';
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

/** Where an invoice starts from: nothing, or a saved invoice to edit, or to replace by a new one. */
export type InvoiceDraftStart =
	| { kind: 'new' }
	| { kind: 'edit'; saved: SavedInvoice }
	| { kind: 'replace'; saved: SavedInvoice };

/** The lines an invoice was saved with, or lines rebuilt from the time as it is now. */
export type InvoiceLinesSource = 'saved' | 'time';

const NEW_INVOICE: InvoiceDraftStart = { kind: 'new' };

const NO_LINES: NamedInvoiceLine[] = [];

/** What an invoice holds when its screen opens. */
interface DraftSeed {
	clientId: string | null;
	period: Period;
	grouping: InvoiceGrouping;
	linesSource: InvoiceLinesSource;
	descriptions: ReadonlyMap<string, string>;
	currencyKey: string | null;
	numberText: string | null;
	issueDay: string | null;
	dueDay: string | null;
	note: string | null;
	discountText: string;
	taxText: string;
}

function newDraftSeedOf(clientId: string | null): DraftSeed {
	return {
		clientId,
		period: periodOfPreset('lastMonth', INVOICE_WEEK_START),
		grouping: 'member',
		linesSource: 'time',
		descriptions: NO_DESCRIPTIONS,
		currencyKey: null,
		numberText: null,
		issueDay: null,
		dueDay: null,
		note: null,
		discountText: '',
		taxText: ''
	};
}

/** A replacement bills what the saved invoice billed, as it did; an edit also keeps its number and its dates. */
function savedDraftSeedOf(saved: SavedInvoice, keepsNumberAndDates: boolean): DraftSeed {
	const period = periodOfDays(saved.period) ?? periodOfPreset('lastMonth', INVOICE_WEEK_START);
	const seed: DraftSeed = {
		clientId: saved.client.id,
		period,
		grouping: saved.grouping,
		linesSource: 'saved',
		descriptions: saved.descriptions,
		currencyKey: currencyKeyOf(saved.currency),
		numberText: null,
		issueDay: null,
		dueDay: null,
		note: saved.note,
		discountText: percentTextOf(saved.discountPercent),
		taxText: percentTextOf(saved.taxPercent)
	};
	if (keepsNumberAndDates) {
		seed.numberText = String(saved.number);
		seed.issueDay = saved.issueDay;
		seed.dueDay = saved.dueDay;
	}
	return seed;
}

function draftSeedOf(start: InvoiceDraftStart, searchedClientId: string | null): DraftSeed {
	if (start.kind === 'new') {
		return newDraftSeedOf(searchedClientId);
	}
	return savedDraftSeedOf(start.saved, start.kind === 'edit');
}

function savedInvoiceOfStart(start: InvoiceDraftStart): SavedInvoice | null {
	if (start.kind === 'new') {
		return null;
	}
	return start.saved;
}

/** The saved invoice's client stands in while the list of active clients does not hold it: it may be archived. */
function savedClientOf(saved: SavedInvoice | null): TClient | null {
	if (!saved) {
		return null;
	}
	const { id, name, primaryEmail, imageUrl } = saved.client;
	return { id, name, primaryEmail, imageUrl };
}

function draftClientOf(clients: ReadonlyArray<TClient>, clientId: string | null, savedClient: TClient | null) {
	const listed = clients.find((candidate) => candidate.id === clientId);
	if (listed) {
		return listed;
	}
	const isSavedClient = savedClient !== null && savedClient.id === clientId;
	if (isSavedClient) {
		return savedClient;
	}
	return null;
}

function linesOfSource(
	source: InvoiceLinesSource,
	savedLines: NamedInvoiceLine[],
	timeLines: NamedInvoiceLine[]
): NamedInvoiceLine[] {
	if (source === 'saved') {
		return savedLines;
	}
	return timeLines;
}

/** The client's other invoices: the invoice edited or replaced is not compared with itself. */
function invoicesBesides<T extends { id: string }>(invoices: T[], saved: SavedInvoice | null): T[] {
	if (!saved) {
		return invoices;
	}
	return invoices.filter((invoice) => invoice.id !== saved.id);
}

/**
 * An invoice while it is prepared: empty, or started from a saved invoice. Nothing reaches the API here; the hooks
 * that create or edit an invoice save it.
 */
export function useInvoiceDraft(start: InvoiceDraftStart = NEW_INVOICE) {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const organizationRead = useCurrentOrganizationOwner();
	const organization = useAtomValue(currentOrganizationState);
	const isOrganizationKnown = organization !== null;
	const hasOrganizationFailed = !isOrganizationKnown && organizationRead.isError;
	const isOrganizationLoading = !isOrganizationKnown && !organizationRead.isError;
	const clientsQuery = useActiveClients();
	const clients = clientsQuery.clients;

	const [seed] = useState(() => draftSeedOf(start, searchParams?.get('client') ?? null));
	const [pickedClientId, setPickedClientId] = useState<string | null>(seed.clientId);
	const [period, setPeriod] = useState<Period>(seed.period);
	const [grouping, setGrouping] = useState<InvoiceGrouping>(seed.grouping);
	const [linesSource, setLinesSource] = useState<InvoiceLinesSource>(seed.linesSource);
	const [removedKeys, setRemovedKeys] = useState<ReadonlySet<string>>(NO_KEYS);
	const [descriptions, setDescriptions] = useState<ReadonlyMap<string, string>>(seed.descriptions);
	const [pickedCurrencyKey, setPickedCurrencyKey] = useState<string | null>(seed.currencyKey);
	const [typedNumber, setTypedNumber] = useState<string | null>(seed.numberText);
	const [pickedIssueDay, setPickedIssueDay] = useState<string | null>(seed.issueDay);
	const [pickedDueDay, setPickedDueDay] = useState<string | null>(seed.dueDay);
	const [typedNote, setTypedNote] = useState<string | null>(seed.note);
	const [discountText, setDiscountText] = useState(seed.discountText);
	const [taxText, setTaxText] = useState(seed.taxText);
	const savedInvoice = savedInvoiceOfStart(start);

	const timeZone = organization?.timeZone;
	const today = useMemo(() => todayDayKey(timeZone), [timeZone]);
	const issueDay = pickedIssueDay ?? today;

	const savedClient = useMemo(() => savedClientOf(savedInvoice), [savedInvoice]);
	const client = useMemo(
		() => draftClientOf(clients, pickedClientId, savedClient),
		[clients, pickedClientId, savedClient]
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
	const readsTime = linesSource === 'time';
	const time = useInvoiceTime({ clientId, period, grouping, labels, enabled: readsTime });
	const savedLines = savedInvoice?.lines ?? NO_LINES;
	const lines = linesOfSource(linesSource, savedLines, time.lines);

	const currencies = useMemo(() => invoiceCurrenciesOf(lines), [lines]);
	const currencyKey = invoiceCurrencyKeyOf(currencies, pickedCurrencyKey);
	const currencyTotal = currencies.find((total) => total.key === currencyKey);
	const currency = currencyTotal?.currency ?? null;
	const otherCurrencies = useMemo(
		() => currencies.filter((total) => total.key !== currencyKey),
		[currencies, currencyKey]
	);

	const invoiceLines = useMemo(
		() => lines.filter((line) => currencyKeyOf(line.currency) === currencyKey),
		[currencyKey, lines]
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

	// An edited invoice keeps its number: the next free one is not read for it.
	const readsNextNumber = start.kind !== 'edit';
	const nextNumber = useNextInvoiceNumber(readsNextNumber);
	const numberText = numberTextOf(typedNumber, nextNumber.nextNumber);
	const dueTerm = invoiceDueTermOf(client?.paymentTermsDays, organization?.daysUntilDue);
	const termDueDay = dueDayAfter(issueDay, dueTerm.days);
	const dueDay = pickedDueDay ?? termDueDay;
	const isDueDayOfTerm = dueDay !== '' && dueDay === termDueDay;
	const note = typedNote ?? organization?.defaultInvoiceEstimateTerms ?? '';

	const periodDays = useMemo(() => invoicePeriodDaysOf(period), [period]);
	const earlier = useClientInvoices(clientId);
	const earlierInvoices = useMemo(
		() => invoicesBesides(earlier.invoices, savedInvoice),
		[earlier.invoices, savedInvoice]
	);
	const overlappingInvoices = useMemo(
		() => overlappingInvoicesOf(earlierInvoices, periodDays),
		[earlierInvoices, periodDays]
	);

	const draftProblems = invoiceProblemsOf({ numberText, issueDay, dueDay, currency, lineCount: keptLines.length });
	const waits = invoiceWaitsOf({ isReadingEarlier: earlier.isLoading, isReadingTimeAgain: time.isUpdating });
	const problems = draftProblems.concat(waits);
	const isWaiting = waits.length > 0;

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

	const refetchTime = time.refetch;
	// What was written on a saved line stays on the rebuilt line with the same project, member and task.
	const takeTimeAgain = useCallback(() => {
		if (linesSource === 'time') {
			refetchTime();
			return;
		}
		setLinesSource('time');
	}, [linesSource, refetchTime]);

	const backToSavedLines = useCallback(() => setLinesSource('saved'), []);

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
		setIssueDay: setPickedIssueDay,
		dueDay,
		setDueDay: setPickedDueDay,
		dueTerm,
		isDueDayOfTerm,
		note,
		setNote: setTypedNote,
		earlierInvoices,
		areEarlierLoading: earlier.isLoading,
		haveEarlierFailed: earlier.isError,
		refetchEarlier: earlier.refetch,
		overlappingInvoices,
		problems,
		isWaiting,
		mode: start.kind,
		savedInvoice,
		linesSource,
		takeTimeAgain,
		backToSavedLines,
		invoiceRequest
	};
}

export type InvoiceDraftState = ReturnType<typeof useInvoiceDraft>;

/** What the invoice screen reads, whether the invoice is new, edited or a replacement. */
export type InvoiceScreenState = InvoiceDraftState & Readonly<{ isSaving: boolean }>;

function newInvoiceStartOf(replaced: SavedInvoice | null): InvoiceDraftStart {
	if (!replaced) {
		return NEW_INVOICE;
	}
	return { kind: 'replace', saved: replaced };
}

/**
 * A new invoice while it is prepared, empty or started from a void invoice it replaces. Nothing reaches the API until
 * `save` is called.
 */
export function useNewInvoice(replaced: SavedInvoice | null = null) {
	const start = useMemo(() => newInvoiceStartOf(replaced), [replaced]);
	const draft = useInvoiceDraft(start);
	const { invoiceRequest, setNumberText } = draft;
	const { createInvoice, isSaving: isCreating } = useCreateInvoice();
	const { saveAndSendInvoice, isSavingAndSending } = useSaveAndSendInvoice();
	const isSaving = isCreating || isSavingAndSending;
	const submit = useCallback(
		async <T>(run: (request: InvoiceRequest) => Promise<T>): Promise<T | null> => {
			const request = invoiceRequest();
			if (!request) {
				return null;
			}
			try {
				return await run(request);
			} catch (error) {
				// The next free number is read again after any failure. A save whose outcome is unknown keeps its own
				// number: had it gone through, saving again under that number is refused instead of creating a second
				// invoice.
				const isUnconfirmed = invoiceSaveFailureOf(error) === 'unconfirmed';
				if (isUnconfirmed) {
					setNumberText(String(request.invoiceNumber));
				}
				throw error;
			}
		},
		[invoiceRequest, setNumberText]
	);

	const save = useCallback(() => submit(createInvoice), [createInvoice, submit]);

	const saveAndSend = useCallback(
		(email: string) => submit((request) => saveAndSendInvoice({ request, email })),
		[saveAndSendInvoice, submit]
	);

	return { ...draft, save, saveAndSend, isSaving };
}

export type NewInvoiceState = ReturnType<typeof useNewInvoice>;
