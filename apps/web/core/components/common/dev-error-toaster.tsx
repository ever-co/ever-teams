'use client';

import { useEffect } from 'react';
import { type Mutation, type Query, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bug } from '@/core/components/icons';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { DEV_ERROR_EVENT, type DevErrorDetail, type DevErrorSource } from '@/core/lib/helpers/dev-error-events';
import { ToastOrb } from './toast-orb';

/** Long enough to read a status and a message and decide to open the inspector. */
const DEV_TOAST_DURATION_MS = 12_000;
const LABEL_MAX_LENGTH = 120;

/** Developer-facing only (this component is mounted in development), so the copy is not translated. */
const SOURCE_TITLE: Record<DevErrorSource, string> = {
	mutation: 'Mutation failed',
	query: 'Query failed',
	log: 'Caught error'
};

const DEV_BADGE_CLASS =
	'inline-flex h-4 items-center rounded-[5px] bg-destructive/10 px-1 font-mono text-[10px] font-semibold text-destructive-ink';

function recordOf(value: unknown): Record<string, unknown> | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}

	return value as Record<string, unknown>;
}

function isCancellation(error: unknown): boolean {
	const record = recordOf(error);
	if (!record) {
		return false;
	}
	const isAbort = record.name === 'AbortError';
	const isAxiosCancel = record.name === 'CanceledError';
	const isCancelCode = record.code === 'ERR_CANCELED';

	return isAbort || isAxiosCancel || isCancelCode;
}

function responseDataOf(error: unknown): unknown {
	const record = recordOf(error);
	const response = recordOf(record?.response);
	if (response) {
		return response.data;
	}

	return record?.details;
}

function textOf(value: unknown): string | null {
	if (typeof value === 'string') {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(String).join(', ');
	}

	return null;
}

/** The server's own message when it sent one, else the exception's. */
function messageOf(error: unknown): string | null {
	const serverMessage = textOf(recordOf(responseDataOf(error))?.message);
	if (serverMessage) {
		return serverMessage;
	}

	return textOf(recordOf(error)?.message);
}

function headlineOf(error: unknown): string {
	const parts: string[] = [];
	const status = errorStatusOf(error);
	if (status !== null) {
		parts.push(String(status));
	}
	const message = messageOf(error);
	if (message) {
		parts.push(message);
	}
	if (parts.length === 0) {
		return String(error);
	}

	return parts.join(' · ');
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}

function requestOf(error: unknown): { method: unknown; url: unknown } | undefined {
	const config = recordOf(recordOf(error)?.config);
	if (!config) {
		return undefined;
	}

	return { method: config.method, url: config.url };
}

function detailsOf(detail: DevErrorDetail): string {
	return safeJson({
		source: detail.source,
		where: detail.label,
		status: errorStatusOf(detail.error),
		message: messageOf(detail.error),
		request: requestOf(detail.error),
		response: responseDataOf(detail.error),
		stack: recordOf(detail.error)?.stack
	});
}

function shortened(text: string): string {
	if (text.length <= LABEL_MAX_LENGTH) {
		return text;
	}

	return `${text.slice(0, LABEL_MAX_LENGTH)}…`;
}

function mutationLabelOf(mutation: Mutation<unknown, unknown, unknown, unknown>): string {
	const key = mutation.options.mutationKey;
	if (key) {
		return safeJson(key);
	}
	const functionName = mutation.options.mutationFn?.name;
	if (functionName) {
		return functionName;
	}

	return 'unnamed mutation';
}

function queryLabelOf(query: Query): string {
	return JSON.stringify(query.queryKey);
}

function showDevError(detail: DevErrorDetail) {
	if (isCancellation(detail.error)) {
		return;
	}
	const label = shortened(detail.label);
	const copyDetails = () => {
		void navigator.clipboard?.writeText(detailsOf(detail));
	};

	toast.error(
		<span className="inline-flex items-center gap-1.5">
			<span className={DEV_BADGE_CLASS}>DEV</span>
			{SOURCE_TITLE[detail.source]}
		</span>,
		{
			id: `dev-error:${detail.source}:${label}`,
			icon: <ToastOrb tone="error" glyph={<Bug />} />,
			description: (
				<span className="flex flex-col gap-0.5 font-mono text-[11px] leading-snug">
					<span className="truncate text-foreground/80">{label}</span>
					<span className="line-clamp-3 break-all">{headlineOf(detail.error)}</span>
				</span>
			),
			duration: DEV_TOAST_DURATION_MS,
			action: { label: 'Copy details', onClick: copyDetails }
		}
	);
}

/**
 * Development only: every failed mutation and query, and every error passed to `logErrorInDev`, shows where it
 * failed and the raw status and message, with the full details one click away, so a failure is noticed when it
 * happens and the inspector is opened at the right moment. Users never see this; they get `MutationErrorToaster`.
 */
export function DevErrorToaster() {
	const queryClient = useQueryClient();

	useEffect(() => {
		const stopMutations = queryClient.getMutationCache().subscribe((event) => {
			const isFailure = event.type === 'updated' && event.action.type === 'error';
			if (!isFailure) {
				return;
			}
			const { mutation } = event;
			showDevError({ source: 'mutation', label: mutationLabelOf(mutation), error: mutation.state.error });
		});

		const stopQueries = queryClient.getQueryCache().subscribe((event) => {
			const isFailure = event.type === 'updated' && event.action.type === 'error';
			if (!isFailure) {
				return;
			}
			const { query } = event;
			showDevError({ source: 'query', label: queryLabelOf(query), error: query.state.error });
		});

		const onLoggedError = (event: Event) => {
			const detail = (event as CustomEvent<DevErrorDetail>).detail;
			showDevError(detail);
		};
		window.addEventListener(DEV_ERROR_EVENT, onLoggedError);

		return () => {
			stopMutations();
			stopQueries();
			window.removeEventListener(DEV_ERROR_EVENT, onLoggedError);
		};
	}, [queryClient]);

	return null;
}
