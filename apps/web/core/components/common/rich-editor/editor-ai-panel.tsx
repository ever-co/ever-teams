'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Check, WritingHelp, Spinner, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { ChatConfigForm, type ChatConfig } from '@/core/components/features/chat-panel/components/chat-config-dialog';
import type { TEditorAssistFailure } from '@/core/services/client/api/ai/editor-assist.service';
import {
	EDITOR_AI_MAX_INSTRUCTION,
	type TEditorAiMode,
	type TEditorAssistAnswer
} from '@/core/types/schemas/ai/editor-assist.schema';
import { cn } from '@/core/lib/helpers';
import { AI_PANEL_MODES } from './editor-config';
import { RichTextView } from './rich-text-view';

export type AiPanelState = {
	/** The document range the operation applies to; null means the whole text. */
	scope: { from: number; to: number } | null;
	/** The Markdown the model reads. */
	source: string;
	mode: TEditorAiMode | null;
	busy: boolean;
	result: TEditorAssistAnswer | null;
	/** The result as HTML, parsed with the editor's own schema, for the preview. */
	resultHtml: string;
	error: TEditorAssistFailure | null;
	/** No AI is configured: the panel shows the configuration instead of the operations. */
	setup: boolean;
};

const MODE_ROW =
	'flex min-w-0 cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5';

function useModeCopy() {
	const t = useTranslations();
	const labels: Record<TEditorAiMode, { label: string; hint: string }> = {
		improve: { label: t('richEditor.ai.MODE_IMPROVE'), hint: t('richEditor.ai.MODE_IMPROVE_HINT') },
		fix: { label: t('richEditor.ai.MODE_FIX'), hint: t('richEditor.ai.MODE_FIX_HINT') },
		shorter: { label: t('richEditor.ai.MODE_SHORTER'), hint: t('richEditor.ai.MODE_SHORTER_HINT') },
		longer: { label: t('richEditor.ai.MODE_LONGER'), hint: t('richEditor.ai.MODE_LONGER_HINT') },
		simplify: { label: t('richEditor.ai.MODE_SIMPLIFY'), hint: t('richEditor.ai.MODE_SIMPLIFY_HINT') },
		summarize: { label: t('richEditor.ai.MODE_SUMMARIZE'), hint: t('richEditor.ai.MODE_SUMMARIZE_HINT') },
		continue: { label: t('richEditor.ai.MODE_CONTINUE'), hint: t('richEditor.ai.MODE_CONTINUE_HINT') },
		tone_friendly: { label: t('richEditor.ai.MODE_FRIENDLY'), hint: t('richEditor.ai.MODE_FRIENDLY_HINT') },
		tone_professional: {
			label: t('richEditor.ai.MODE_PROFESSIONAL'),
			hint: t('richEditor.ai.MODE_PROFESSIONAL_HINT')
		},
		tone_direct: { label: t('richEditor.ai.MODE_DIRECT'), hint: t('richEditor.ai.MODE_DIRECT_HINT') },
		custom: { label: t('richEditor.ai.MODE_CUSTOM'), hint: '' }
	};
	return labels;
}

function useFailureCopy() {
	const t = useTranslations();
	const messages: Record<TEditorAssistFailure, string> = {
		invalid_request: t('richEditor.ai.errors.INVALID_REQUEST'),
		not_configured: t('richEditor.ai.errors.NOT_CONFIGURED'),
		invalid_base_url: t('richEditor.ai.errors.INVALID_BASE_URL'),
		provider_auth: t('richEditor.ai.errors.PROVIDER_AUTH'),
		provider_rate_limit: t('richEditor.ai.errors.PROVIDER_RATE_LIMIT'),
		provider_unavailable: t('richEditor.ai.errors.PROVIDER_UNAVAILABLE'),
		empty_result: t('richEditor.ai.errors.EMPTY_RESULT'),
		unauthorized: t('richEditor.ai.errors.UNAUTHORIZED'),
		service_unavailable: t('richEditor.ai.errors.SERVICE_UNAVAILABLE'),
		network: t('richEditor.ai.errors.NETWORK'),
		aborted: t('richEditor.ai.errors.PROVIDER_UNAVAILABLE')
	};
	return messages;
}

function PanelHeader({ title, scopeLabel, onClose }: { title: string; scopeLabel: string; onClose: () => void }) {
	const t = useTranslations();
	return (
		<div className="flex min-w-0 items-center gap-2">
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-ink [&_svg]:size-3.5">
				<WritingHelp aria-hidden="true" />
			</span>
			<span className="shrink-0 text-[13px] font-medium text-foreground">{title}</span>
			<span className="min-w-0 truncate text-xs text-muted-foreground">{scopeLabel}</span>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={t('richEditor.ai.CLOSE')}
				className="ml-auto shrink-0 text-muted-foreground"
				onClick={onClose}
			>
				<X aria-hidden="true" />
			</Button>
		</div>
	);
}

function SetupScreen({
	config,
	onSaveConfig,
	onClose
}: {
	config: ChatConfig | null;
	onSaveConfig: (config: ChatConfig) => void;
	onClose: () => void;
}) {
	const t = useTranslations();
	const [showForm, setShowForm] = useState(false);
	if (showForm) {
		return (
			<div className="mt-3">
				<ChatConfigForm config={config} onSave={onSaveConfig} onCancel={() => setShowForm(false)} />
			</div>
		);
	}
	return (
		<div className="mt-2 flex flex-col gap-2">
			<p className="text-[13px] font-medium text-foreground">{t('richEditor.ai.SETUP_TITLE')}</p>
			<p className="text-xs text-muted-foreground">{t('richEditor.ai.SETUP_DESCRIPTION')}</p>
			<div className="flex flex-wrap items-center gap-1.5">
				<Button type="button" size="sm" onClick={() => setShowForm(true)}>
					{t('richEditor.ai.SETUP_ACTION')}
				</Button>
				<Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
					{t('richEditor.ai.NOT_NOW')}
				</Button>
			</div>
		</div>
	);
}

function ModesScreen({ onRun }: { onRun: (mode: TEditorAiMode, instruction?: string) => void }) {
	const t = useTranslations();
	const modeCopy = useModeCopy();
	const [instruction, setInstruction] = useState('');
	const trimmedInstruction = instruction.trim();

	function submitInstruction(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (trimmedInstruction) {
			onRun('custom', trimmedInstruction);
		}
	}

	return (
		<div className="mt-2 flex flex-col gap-2">
			<div className="grid gap-0.5 sm:grid-cols-2">
				{AI_PANEL_MODES.map((mode) => (
					<button key={mode} type="button" onClick={() => onRun(mode)} className={MODE_ROW}>
						<span className="shrink-0">{modeCopy[mode].label}</span>
						<span className="min-w-0 truncate text-xs text-muted-foreground">{modeCopy[mode].hint}</span>
					</button>
				))}
			</div>
			<form className="flex items-center gap-1.5" onSubmit={submitInstruction}>
				<Input
					value={instruction}
					onChange={(event) => setInstruction(event.target.value)}
					maxLength={EDITOR_AI_MAX_INSTRUCTION}
					placeholder={t('richEditor.ai.CUSTOM_PLACEHOLDER')}
					aria-label={t('richEditor.ai.MODE_CUSTOM')}
					className="h-8 text-[13px] md:text-[13px]"
				/>
				<Button type="submit" size="default" disabled={!trimmedInstruction}>
					{t('richEditor.ai.CUSTOM_SUBMIT')}
				</Button>
			</form>
		</div>
	);
}

function BusyScreen() {
	const t = useTranslations();
	return (
		<div className="mt-2 flex items-center gap-2 py-2 text-[13px] text-muted-foreground">
			<Spinner className="size-3.5 animate-spin" aria-hidden="true" />
			<span>{t('richEditor.ai.WORKING')}</span>
			<span role="status" aria-live="polite" className="sr-only">
				{t('richEditor.ai.WORKING_STATUS')}
			</span>
		</div>
	);
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
	const t = useTranslations();
	return (
		<div className="mt-2 flex flex-col items-start gap-2">
			<p className="text-[13px] text-destructive-ink" role="alert">
				{message}
			</p>
			<Button type="button" variant="outline" size="sm" onClick={onBack}>
				{t('richEditor.ai.TRY_SOMETHING_ELSE')}
			</Button>
		</div>
	);
}

function ResultActions({
	isContinue,
	onApply,
	onBack,
	onClose
}: {
	isContinue: boolean;
	onApply: (how: 'replace' | 'insert') => void;
	onBack: () => void;
	onClose: () => void;
}) {
	const t = useTranslations();
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{isContinue && (
				<Button type="button" size="sm" onClick={() => onApply('insert')}>
					<Check aria-hidden="true" />
					{t('richEditor.ai.INSERT')}
				</Button>
			)}
			{!isContinue && (
				<>
					<Button type="button" size="sm" onClick={() => onApply('replace')}>
						<Check aria-hidden="true" />
						{t('richEditor.ai.REPLACE')}
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => onApply('insert')}>
						{t('richEditor.ai.INSERT_BELOW')}
					</Button>
				</>
			)}
			<Button type="button" variant="ghost" size="sm" onClick={onBack}>
				{t('richEditor.ai.TRY_ANOTHER')}
			</Button>
			<Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
				{t('richEditor.ai.DISCARD')}
			</Button>
		</div>
	);
}

function ResultScreen({
	state,
	onApply,
	onBack,
	onClose
}: {
	state: AiPanelState;
	onApply: (how: 'replace' | 'insert') => void;
	onBack: () => void;
	onClose: () => void;
}) {
	const isContinue = state.mode === 'continue';
	const note = state.result?.note;
	return (
		<div className="mt-2 flex flex-col gap-2">
			<RichTextView
				value={state.resultHtml}
				className={cn(
					'max-h-64 overflow-y-auto rounded-lg bg-card px-3 py-2 hairline-ring ring-border',
					isContinue && 'border-l-2 border-l-primary/40'
				)}
			/>
			{note && (
				<p className="flex items-start gap-1.5 text-xs text-muted-foreground">
					<WritingHelp className="mt-px size-3.5 shrink-0 text-primary-ink" aria-hidden="true" />
					<span>{note}</span>
				</p>
			)}
			<ResultActions isContinue={isContinue} onApply={onApply} onBack={onBack} onClose={onClose} />
		</div>
	);
}

function scopeLabelOf(t: ReturnType<typeof useTranslations>, state: AiPanelState) {
	const count = state.source.length;
	if (state.scope) {
		return t('richEditor.ai.SCOPE_SELECTION', { count });
	}
	return t('richEditor.ai.SCOPE_ALL', { count });
}

function panelTitleOf(state: AiPanelState, modeCopy: Record<TEditorAiMode, { label: string }>, fallback: string) {
	if (!state.mode) {
		return fallback;
	}
	return modeCopy[state.mode].label;
}

/**
 * Writing help, drawn inside the editor under the text. Nothing touches the description until the user presses
 * Replace or Insert: the proposal is shown rendered with a note of what changed, and Discard costs one click.
 * A panel rather than a floating menu: a proposal can be long, must read on a phone, and must not vanish when the
 * selection moves.
 */
export function EditorAiPanel({
	state,
	config,
	onRun,
	onApply,
	onBack,
	onClose,
	onSaveConfig
}: {
	state: AiPanelState;
	config: ChatConfig | null;
	onRun: (mode: TEditorAiMode, instruction?: string) => void;
	onApply: (how: 'replace' | 'insert') => void;
	onBack: () => void;
	onClose: () => void;
	onSaveConfig: (config: ChatConfig) => void;
}) {
	const t = useTranslations();
	const modeCopy = useModeCopy();
	const failureCopy = useFailureCopy();
	const title = panelTitleOf(state, modeCopy, t('richEditor.ai.TITLE'));
	const scopeLabel = scopeLabelOf(t, state);
	const isIdle = !state.busy;
	const showsModes = isIdle && !state.mode;
	const showsError = isIdle && Boolean(state.error);
	const showsResult = isIdle && Boolean(state.result);

	function closeOnEscape(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		onClose();
	}

	let body = null;
	if (state.setup) {
		body = <SetupScreen config={config} onSaveConfig={onSaveConfig} onClose={onClose} />;
	} else if (state.busy) {
		body = <BusyScreen />;
	} else if (showsModes) {
		body = <ModesScreen onRun={onRun} />;
	} else if (showsError && state.error) {
		body = <ErrorScreen message={failureCopy[state.error]} onBack={onBack} />;
	} else if (showsResult) {
		body = <ResultScreen state={state} onApply={onApply} onBack={onBack} onClose={onClose} />;
	}

	return (
		<div
			role="region"
			aria-label={t('richEditor.ai.TITLE')}
			className="hairline-t border-border bg-foreground/[0.02] px-2.5 py-2.5"
			onKeyDown={closeOnEscape}
		>
			<PanelHeader title={title} scopeLabel={scopeLabel} onClose={onClose} />
			{body}
		</div>
	);
}
