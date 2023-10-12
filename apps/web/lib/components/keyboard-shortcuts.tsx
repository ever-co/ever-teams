import { useDetectOS, useModal } from '@app/hooks';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@components/ui/dialog';
import { useCallback, useMemo } from 'react';
import { Button } from './button';
import { FlashCircleLinearIcon } from './svgs';

export function KeyboardShortcuts() {
	const { isOpen, closeModal, openModal } = useModal();

	const { os } = useDetectOS();
	const osSpecificStartTimerLabel = useMemo(() => {
		if (os === 'Mac') {
			return ['Ctrl(⌃)', 'Opt(⌥)', ']'];
		}

		return ['Ctrl', 'Alt', ']'];
	}, [os]);
	const osSpecificStopTimerLabel = useMemo(() => {
		if (os === 'Mac') {
			return ['Ctrl(⌃)', 'Opt(⌥)', '['];
		}

		return ['Ctrl', 'Alt', '['];
	}, [os]);

	const toggle = useCallback(() => {
		if (isOpen) {
			closeModal();
		} else {
			openModal();
		}
	}, [isOpen, closeModal, openModal]);

	return (
		<>
			<Button variant="ghost" className="p-0 m-0 min-w-0" onClick={toggle}>
				<FlashCircleLinearIcon className="stroke-black dark:stroke-white w-7 h-7" />
			</Button>

			<Dialog open={isOpen} defaultOpen={isOpen} onOpenChange={toggle}>
				<DialogContent>
					<DialogHeader className="flex flex-col gap-5">
						<DialogTitle>Keyboard Shortcuts</DialogTitle>
						<DialogDescription className="flex flex-col gap-2">
							<p className="text-base font-normal text-black">Timer</p>
							<div className="flex flex-row justify-between items-center">
								<div>
									<p className="text-sm font-normal">Start Timer</p>
								</div>
								<div className="flex flex-row gap-2">
									{osSpecificStartTimerLabel.map((label) => (
										<div
											key={label}
											className="border rounded-md py-1 px-3 text-dark-high dark:text-white"
										>
											{label}
										</div>
									))}
								</div>
							</div>
							<div className="flex flex-row justify-between items-center">
								<div>
									<p className="text-sm font-normal">Stop Timer</p>
								</div>
								<div className="flex flex-row gap-2">
									{osSpecificStopTimerLabel.map((label) => (
										<div
											key={label}
											className="border rounded-md py-1 px-3 text-dark-high dark:text-white"
										>
											{label}
										</div>
									))}
								</div>
							</div>
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		</>
	);
}
