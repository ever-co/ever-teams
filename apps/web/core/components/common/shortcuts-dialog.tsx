'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import {
	bindingKeyCaps,
	chordOfEvent,
	conflictsOf,
	parseBinding,
	refusalOf,
	SHORTCUT_COMMANDS,
	SHORTCUT_CONTEXTS,
	withOverride,
	type ShortcutBinding,
	type ShortcutChord,
	type ShortcutCommand,
	type ShortcutContext
} from '@/core/lib/keyboard/shortcuts';
import { cn } from '@/core/lib/helpers';
import { shortcutsHelpOpenAtom } from '@/core/stores/common/shortcuts';

/** How long the next chord of a recorded sequence may take. */
const RECORD_TIMEOUT_MS = 900;

/** Why a recorded binding is refused, as the person reads it. */
const REFUSAL_MESSAGES = {
	reserved: 'shortcuts.RESERVED',
	sequence: 'shortcuts.SINGLE_KEY_ONLY',
	modifier: 'shortcuts.NO_MOD_KEY',
	listKey: 'shortcuts.LIST_KEY'
} as const satisfies Record<NonNullable<ReturnType<typeof refusalOf>>, DottedLanguageObjectStringPaths>;

function KeyCaps({ binding, isMac }: Readonly<{ binding: ShortcutBinding | null; isMac: boolean }>) {
	const t = useTranslations();
	if (!binding) return <span className="text-xs text-muted-foreground">{t('shortcuts.NONE')}</span>;
	return (
		<span className="flex items-center gap-1.5">
			{bindingKeyCaps(binding, isMac).map((caps, at) => (
				<span key={`${at}:${caps.join('+')}`} className="flex items-center gap-0.5">
					{at > 0 && <span className="px-0.5 text-xs text-muted-foreground">{t('shortcuts.THEN')}</span>}
					{caps.map((cap) => (
						<kbd key={cap} className="min-w-6 rounded-md bg-foreground/5 px-1.5 py-0.5 text-center font-sans text-xs font-medium text-foreground hairline-ring ring-border">
							{cap}
						</kbd>
					))}
				</span>
			))}
		</span>
	);
}

interface RowProps {
	command: ShortcutCommand;
	binding: ShortcutBinding | null;
	isMac: boolean;
	isRecording: boolean;
	recorded: ShortcutChord[];
	canRebind: boolean;
	/** Whether the person left this command's binding alone (a disabled one is a change too). */
	isDefault: boolean;
	onRecord: () => void;
	onReset: () => void;
}

function CommandRow({ command, binding, isMac, isRecording, recorded, canRebind, isDefault, onRecord, onReset }: Readonly<RowProps>) {
	const t = useTranslations();
	const label = t(`shortcuts.commands.${command.id}` as DottedLanguageObjectStringPaths);
	return (
		<div className={cn('flex items-center justify-between gap-3 py-1.5', isRecording && 'rounded-md bg-primary/5 px-2')}>
			<span className="text-sm text-foreground">{label}</span>
			<span className="flex items-center gap-2">
				{isRecording ? (
					<span className="text-xs text-primary">{recorded.length ? <KeyCaps binding={recorded} isMac={isMac} /> : t('shortcuts.PRESS_KEYS')}</span>
				) : (
					<KeyCaps binding={binding} isMac={isMac} />
				)}
				{canRebind && !command.fixed && (
					<>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onRecord} disabled={isRecording}>
							{t('shortcuts.CHANGE')}
						</Button>
						{!isDefault && (
							<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={onReset}>
								{t('shortcuts.RESET')}
							</Button>
						)}
					</>
				)}
			</span>
		</div>
	);
}

/**
 * The shortcuts help (`?`): every command by area with its binding in force. With the saved-views feature on, a
 * person changes a binding by recording the keys (a chord, or two chords within a second), with conflicts named
 * and the browser's own combinations refused; the change follows them across devices.
 */
export function ShortcutsDialog() {
	const t = useTranslations();
	const { os } = useDetectOS();
	const isMac = os === 'Mac';
	const [open, setOpen] = useAtom(shortcutsHelpOpenAtom);
	const { bindings, overrides, setOverrides, canRebind } = useKeyboardPreferences();
	const [recordingId, setRecordingId] = useState<string | null>(null);
	const [recorded, setRecorded] = useState<ShortcutChord[]>([]);
	// One save at a time: the next change starts from the overrides the platform answered, never from stale ones.
	const [isSaving, setIsSaving] = useState(false);

	const byContext = useMemo(() => {
		const groups = new Map<ShortcutContext, ShortcutCommand[]>();
		for (const context of SHORTCUT_CONTEXTS) groups.set(context, []);
		for (const command of SHORTCUT_COMMANDS) groups.get(command.context)?.push(command);
		return [...groups.entries()].filter(([, commands]) => commands.length > 0);
	}, []);

	const commit = useCallback(
		async (commandId: string, binding: ShortcutBinding | null) => {
			const command = SHORTCUT_COMMANDS.find((item) => item.id === commandId);
			if (!command || isSaving) return;
			const refusal = binding ? refusalOf(command, binding) : null;
			if (refusal) {
				toast.error(t(REFUSAL_MESSAGES[refusal]));
				return;
			}
			if (binding) {
				const conflicts = conflictsOf(commandId, binding, SHORTCUT_COMMANDS, bindings);
				if (conflicts.length) {
					const names = conflicts.map((item) => t(`shortcuts.commands.${item.id}` as DottedLanguageObjectStringPaths)).join(', ');
					toast.error(t('shortcuts.CONFLICT', { commands: names }));
					return;
				}
			}
			setIsSaving(true);
			try {
				await setOverrides(withOverride(overrides, commandId, binding, command.defaultBinding));
				toast.success(t('shortcuts.SAVED'));
			} catch {
				toast.error(t('shortcuts.SAVE_FAILED'));
			} finally {
				setIsSaving(false);
			}
		},
		[bindings, isSaving, overrides, setOverrides, t]
	);

	// Recording: the chords pressed go to the command; a second chord within the window makes a sequence.
	useEffect(() => {
		if (!recordingId) return;
		let chords: ShortcutChord[] = [];
		let timer: ReturnType<typeof setTimeout> | null = null;
		const finish = () => {
			setRecordingId(null);
			setRecorded([]);
			if (chords.length) void commit(recordingId, chords);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			event.preventDefault();
			event.stopPropagation();
			if (event.key === 'Escape') {
				chords = [];
				finish();
				return;
			}
			const chord = chordOfEvent(event);
			if (!chord) return;
			chords = [...chords, chord].slice(0, 2);
			setRecorded(chords);
			if (timer) clearTimeout(timer);
			if (chords.length === 2) finish();
			else timer = setTimeout(finish, RECORD_TIMEOUT_MS);
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => {
			window.removeEventListener('keydown', onKeyDown, true);
			if (timer) clearTimeout(timer);
		};
	}, [commit, recordingId]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t('shortcuts.TITLE')}</DialogTitle>
					<DialogDescription>{canRebind ? t('shortcuts.DESCRIPTION_REBIND') : t('shortcuts.DESCRIPTION')}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{byContext.map(([context, commands]) => (
						<section key={context} className="flex flex-col gap-1">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{t(`shortcuts.contexts.${context}` as DottedLanguageObjectStringPaths)}
							</h3>
							{commands.map((command) => (
								<CommandRow
									key={command.id}
									command={command}
									binding={bindings.get(command.id) ?? null}
									isMac={isMac}
									isRecording={recordingId === command.id}
									recorded={recorded}
									canRebind={canRebind && !isSaving}
									isDefault={overrides[command.id] === undefined}
									onRecord={() => {
										setRecorded([]);
										setRecordingId(command.id);
									}}
									onReset={() => void commit(command.id, parseBinding(command.defaultBinding))}
								/>
							))}
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
