'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { commandKeycapClass } from '@/core/components/common/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { Button } from '@/core/components/duplicated-components/_button';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { useKeyboardPreferences } from '@/core/hooks/keyboard/use-keyboard-preferences';
import { useShortcutSheet } from '@/core/hooks/keyboard/use-shortcut-sheet';
import {
	bindingKeyCaps,
	chordOfEvent,
	conflictsOf,
	parseBinding,
	refusalOf,
	withOverride,
	type ShortcutBinding,
	type ShortcutChord
} from '@/core/lib/keyboard/shortcuts';
import type { ShortcutKeys, ShortcutSheetLine } from '@/core/lib/keyboard/shortcut-sheet';
import { cn } from '@/core/lib/helpers';
import { availableShortcutCommands } from '@/core/lib/keyboard/available-commands';
import { shortcutsHelpOpenAtom } from '@/core/stores/common/shortcuts';

/** How long the next chord of a recorded sequence may take. */
const RECORD_TIMEOUT_MS = 900;

/** Why a recorded binding is refused, as the person reads it. */
const REFUSAL_MESSAGES = {
	reserved: 'shortcuts.RESERVED',
	sequence: 'shortcuts.SINGLE_KEY_ONLY',
	chatSequence: 'shortcuts.CHAT_SINGLE_KEY',
	chatTaken: 'shortcuts.CHAT_TAKEN',
	modifier: 'shortcuts.NO_MOD_KEY',
	listKey: 'shortcuts.LIST_KEY'
} as const satisfies Record<NonNullable<ReturnType<typeof refusalOf>>, DottedLanguageObjectStringPaths>;

const KEYS_HINT = 'text-xs text-muted-foreground';

/**
 * Two columns from the md width, which the dialog widens for. Lines that carry a Change button keep the one column
 * they had: a column half as wide pushes their keys and button onto a second line.
 */
const SHEET_LAYOUTS = {
	columns: 'flex flex-col gap-4 md:block md:columns-2 md:gap-8 md:[&>section]:pb-4 md:[&>section:last-child]:pb-0',
	oneColumn: 'flex flex-col gap-4'
} as const;

type SheetLayout = keyof typeof SHEET_LAYOUTS;

function sheetLayoutOf(canRebind: boolean): SheetLayout {
	if (canRebind) {
		return 'oneColumn';
	}
	return 'columns';
}

function chordKeyOf(caps: readonly string[]): string {
	return caps.join('+');
}

function wayKeyOf(way: ShortcutKeys): string {
	const chords = way.map(chordKeyOf);
	return chords.join(' ');
}

/** One way to press a shortcut: the key caps of its chords in order, "then" between two chords. */
function WayCaps({ way }: Readonly<{ way: ShortcutKeys }>) {
	const t = useTranslations();
	return (
		<span className="flex items-center gap-1">
			{way.map((caps, at) => (
				<span key={`${at}:${chordKeyOf(caps)}`} className="flex items-center gap-0.5">
					{at > 0 && <span className={cn(KEYS_HINT, 'px-0.5')}>{t('shortcuts.THEN')}</span>}
					{caps.map((cap) => (
						<kbd key={cap} className={commandKeycapClass}>
							{cap}
						</kbd>
					))}
				</span>
			))}
		</span>
	);
}

/** Every way to press a shortcut, "or" between two; "None" for a command the person left without a key. */
function LineKeys({ keys }: Readonly<{ keys: readonly ShortcutKeys[] }>) {
	const t = useTranslations();
	if (keys.length === 0) {
		return <span className={KEYS_HINT}>{t('shortcuts.NONE')}</span>;
	}
	return (
		<span className="flex flex-wrap items-center justify-end gap-1.5">
			{keys.map((way, at) => (
				<span key={wayKeyOf(way)} className="flex items-center gap-1.5">
					{at > 0 && <span className={KEYS_HINT}>{t('shortcuts.OR')}</span>}
					<WayCaps way={way} />
				</span>
			))}
		</span>
	);
}

/** The keys pressed so far while a binding is recorded, or the invitation to press some. */
function RecordedKeys({ recorded, isMac }: Readonly<{ recorded: ShortcutChord[]; isMac: boolean }>) {
	const t = useTranslations();
	if (recorded.length === 0) {
		return <span className="text-xs text-primary-ink">{t('shortcuts.PRESS_KEYS')}</span>;
	}
	const way = bindingKeyCaps(recorded, isMac);
	return <WayCaps way={way} />;
}

interface RowProps {
	line: ShortcutSheetLine;
	isMac: boolean;
	isRecording: boolean;
	recorded: ShortcutChord[];
	canRebind: boolean;
	/** Whether the person left this command's binding alone (a disabled one is a change too). */
	isDefault: boolean;
	onRecord: () => void;
	onReset: () => void;
}

/** A shortcut and its keys. Only a registry command that is not fixed can be given other keys. */
function ShortcutRow({
	line,
	isMac,
	isRecording,
	recorded,
	canRebind,
	isDefault,
	onRecord,
	onReset
}: Readonly<RowProps>) {
	const t = useTranslations();
	const label = t(line.labelKey as DottedLanguageObjectStringPaths);
	const isFixed = !line.command || Boolean(line.command.fixed);
	const offersChange = canRebind && !isFixed;
	return (
		<div
			className={cn(
				'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1',
				isRecording && 'rounded-md bg-primary/5 px-2'
			)}
		>
			<span className="min-w-0 text-[13px] text-foreground">{label}</span>
			<span className="ml-auto flex items-center gap-2">
				{isRecording && <RecordedKeys recorded={recorded} isMac={isMac} />}
				{!isRecording && <LineKeys keys={line.keys} />}
				{offersChange && (
					<>
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs"
							onClick={onRecord}
							disabled={isRecording}
						>
							{t('shortcuts.CHANGE')}
						</Button>
						{!isDefault && (
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs text-muted-foreground"
								onClick={onReset}
							>
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
 * The sheet's content: every key the app answers for this person, by group. With the saved-views feature on, a
 * person changes the binding of a registry command by recording the keys (a chord, or two chords within a second),
 * with conflicts named and the browser's own combinations refused; the change follows them across devices.
 */
function ShortcutsSheet() {
	const t = useTranslations();
	const { os } = useDetectOS();
	const isMac = os === 'Mac';
	const sections = useShortcutSheet();
	const { bindings, overrides, setOverrides, canRebind } = useKeyboardPreferences();
	const [recordingId, setRecordingId] = useState<string | null>(null);
	const [recorded, setRecorded] = useState<ShortcutChord[]>([]);
	// One save at a time: the next change starts from the overrides the platform answered, never from stale ones.
	const [isSaving, setIsSaving] = useState(false);

	const commit = useCallback(
		async (commandId: string, binding: ShortcutBinding | null) => {
			const command = availableShortcutCommands().find((item) => item.id === commandId);
			if (!command || isSaving) return;
			const refusal = binding ? refusalOf(command, binding) : null;
			if (refusal) {
				toast.error(t(REFUSAL_MESSAGES[refusal]));
				return;
			}
			if (binding) {
				const conflicts = conflictsOf(commandId, binding, availableShortcutCommands(), bindings);
				if (conflicts.length) {
					const names = conflicts
						.map((item) => t(`shortcuts.commands.${item.id}` as DottedLanguageObjectStringPaths))
						.join(', ');
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
			// A plain Escape stops the recording; with a modifier (Shift+Escape) it is a key to record.
			if (event.key === 'Escape' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
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

	const record = (line: ShortcutSheetLine) => {
		setRecorded([]);
		setRecordingId(line.id);
	};
	const reset = (line: ShortcutSheetLine) => {
		if (!line.command) return;
		void commit(line.command.id, parseBinding(line.command.defaultBinding));
	};
	let description = t('shortcuts.DESCRIPTION');
	if (canRebind) {
		description = t('shortcuts.DESCRIPTION_REBIND');
	}
	const layout = sheetLayoutOf(canRebind);

	return (
		<>
			<DialogHeader>
				<DialogTitle>{t('shortcuts.TITLE')}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<div data-layout={layout} className={SHEET_LAYOUTS[layout]}>
				{sections.map((section) => (
					<section key={section.group} className="flex break-inside-avoid flex-col">
						<h3 className="pb-1 text-xs font-medium text-muted-foreground">
							{t(`shortcuts.groups.${section.group}`)}
						</h3>
						{section.lines.map((line) => (
							<ShortcutRow
								key={line.id}
								line={line}
								isMac={isMac}
								isRecording={recordingId === line.id}
								recorded={recorded}
								canRebind={canRebind && !isSaving}
								isDefault={overrides[line.id] === undefined}
								onRecord={() => record(line)}
								onReset={() => reset(line)}
							/>
						))}
					</section>
				))}
			</div>
		</>
	);
}

/**
 * The shortcuts sheet (`?`, the keyboard button of the top bar, the palette's "Keyboard shortcuts"): one dialog
 * for the whole app. Its content is mounted, and its keys read, only while it is open.
 */
export function ShortcutsDialog() {
	const [open, setOpen] = useAtom(shortcutsHelpOpenAtom);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg md:has-[[data-layout=columns]]:max-w-2xl">
				<ShortcutsSheet />
			</DialogContent>
		</Dialog>
	);
}
