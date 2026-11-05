import { Button, Modal, Text } from '@/core/components';
import { ReactNode, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export const RemoveModal = ({
	open,
	close,
	title,
	onAction,
	loading,
	children,
	confirmDisabled = false
}: {
	open: boolean;
	close: () => void;
	title: string;
	onAction: () => any;
	loading: boolean;
	/** Optional details under the title (e.g. what a deletion will remove). */
	children?: ReactNode;
	/** Keeps Confirm disabled, e.g. until those details are loaded. */
	confirmDisabled?: boolean;
}) => {
	const t = useTranslations();
	const [notifyMessage, setNotifyMessage] = useState<string>('');
	// The attempt whose answer the modal still waits for: closing the modal ends it, so an answer that arrives
	// after a Discard is dropped instead of showing its message on the next opening.
	const attemptRef = useRef(0);
	// A message is about one attempt: the next opening of the modal starts clean.
	const handleClose = () => {
		attemptRef.current += 1;
		setNotifyMessage('');
		close();
	};

	return (
		<>
			<Modal isOpen={open} closeModal={handleClose}>
				<div className="flex w-full flex-col gap-4 sm:w-md">
					<Text.Heading as="h3" className="pr-8">
						{title}
					</Text.Heading>

					{children && <div className="self-stretch">{children}</div>}

					{notifyMessage && <Text.Error className="self-start">{notifyMessage}</Text.Error>}

					<div className="flex w-full flex-wrap items-center justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={handleClose}>
							{t('common.DISCARD')}
						</Button>

						<Button
							variant="danger"
							type="submit"
							disabled={loading || confirmDisabled}
							loading={loading}
							onClick={async () => {
								setNotifyMessage('');
								attemptRef.current += 1;
								const attempt = attemptRef.current;
								const isCurrent = () => attempt === attemptRef.current;
								// A failed action used to be an unhandled rejection: the modal stayed open, silent.
								// An action with nothing to act on (data not loaded yet) throws, so it is reported too.
								try {
									const res = await onAction();
									if (!isCurrent()) return;
									if (res?.data?.data?.status) {
										setNotifyMessage(res?.data?.data?.message || '');
										return;
									}

									handleClose();
								} catch (error) {
									if (!isCurrent()) return;
									const reason = error instanceof Error && error.message ? ` ${error.message}` : '';
									setNotifyMessage(`${t('alerts.ACTION_FAILED')}${reason}`);
								}
							}}
						>
							{t('common.CONFIRM')}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
};
