/* eslint-disable no-mixed-spaces-and-tabs */
import { HostKeys, HostKeysMapping, useDetectOS, useHotkeys, useModal } from '@/core/hooks';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { useCallback } from 'react';
import { Button } from './button';
import { DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Keyboard } from '@/core/components/icons';
import { Tooltip } from '../duplicated-components/tooltip';

export function KeyboardShortcuts() {
	const t = useTranslations();
	const { isOpen, closeModal, openModal } = useModal();

	const { os } = useDetectOS();

	const toggle = useCallback(() => {
		if (isOpen) {
			closeModal();
		} else {
			openModal();
		}
	}, [isOpen, closeModal, openModal]);

	// Handling Hotkeys
	useHotkeys(HostKeys.SHORTCUT_LIST, toggle);

	return (
		<>
			<Tooltip label={t('common.KEYBOARD_SHORTCUTS')} placement="auto">
				<Button
					variant="ghost"
					size="icon"
					className="m-0 min-w-0 text-muted-foreground"
					onClick={toggle}
					aria-label={t('common.KEYBOARD_SHORTCUTS')}
				>
					<Keyboard className="size-4" />
				</Button>
			</Tooltip>

			<Dialog open={isOpen} defaultOpen={isOpen} onOpenChange={toggle}>
				<DialogContent>
					<DialogHeader className="flex flex-col gap-5">
						<DialogTitle>{t('common.KEYBOARD_SHORTCUTS')}</DialogTitle>
						<DialogDescription className="flex flex-col gap-2">
							{HostKeysMapping.map((item, index) => (
								<div key={index} className="flex flex-col gap-2">
									<p className="text-sm font-medium text-foreground">
										{t(`hotkeys.${item.heading}` as DottedLanguageObjectStringPaths)}
									</p>

									{item.keySequence.map((keySeq, keySeqIndex) => (
										<div
											className="flex flex-row items-center justify-between"
											key={`key-seq-${keySeqIndex}`}
										>
											<div>
												<p className="text-sm font-normal">
													{t(`hotkeys.${keySeq.label}` as DottedLanguageObjectStringPaths)}
												</p>
											</div>
											<div className="flex flex-row gap-2">
												{[...(os === 'Mac' ? keySeq.sequence.MAC : keySeq.sequence.OTHER)].map(
													(label) => (
														<div
															key={label}
															className="min-w-10 rounded-md bg-foreground/5 px-2 py-0.5 text-center font-sans text-xs font-medium text-foreground hairline-ring ring-border"
														>
															{label}
														</div>
													)
												)}
											</div>
										</div>
									))}

									{/* Divider */}
									{index !== HostKeysMapping.length - 1 && (
										<div className="mx-auto h-px w-full bg-border"></div>
									)}
								</div>
							))}
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}
