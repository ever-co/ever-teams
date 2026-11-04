import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Button } from '@/core/components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EditPenUnderlineIcon } from 'assets/svg';
import { sizeOption } from '@/core/constants/config/constants';
import { Spinner } from '@/core/components/icons';
import { clsxm } from '@/core/lib/utils';

const TeamSize = ({
	defaultValue,
	onChange,
	isTeamManager,
	disabled: disableButton,
	onSave
}: {
	defaultValue: string;
	onChange: (teamSize: string) => void;
	isTeamManager: boolean;
	disabled?: boolean;
	onSave?: (data?: Record<string, any>) => Promise<void>;
}) => {
	const t = useTranslations();
	const [value, setValue] = useState(defaultValue || 'Only me');
	const buttonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [disabled, setDisabled] = useState<boolean>(true);
	const [loading, setLoading] = useState(false);

	const toggleDisabled = useCallback(() => {
		setDisabled(!disabled);
	}, [disabled]);

	const onSelect = (value: any) => {
		setValue(value);
		onChange(value);
	};
	// const Close = () => {
	// 	setValue('');
	// 	buttonRef.current?.click();
	// };

	const handleSave = useCallback(async () => {
		setLoading(true);
		try {
			await onSave?.();
		} catch (error) {
			console.error('Error saving team size:', error);
		} finally {
			setLoading(false);
		}
		setDisabled(true);
	}, [onSave]);

	useEffect(() => {
		setValue(defaultValue);
	}, [defaultValue]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setDisabled(true);
			}
		};

		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setDisabled(true);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyPress);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, []);

	const handleClose = useCallback(() => {
		onChange(defaultValue);
		setValue(defaultValue);
		setDisabled(true);
	}, [defaultValue, onChange]);

	return (
		<div
			className={clsxm(
				'group relative flex h-9 w-full items-center justify-between gap-1 rounded-md hairline-border border-transparent px-3 text-sm',
				'hairline-ring ring-foreground/10 shadow-sm shadow-black/10 dark:ring-foreground/15',
				disabled && 'bg-foreground/[0.025]',
				!disabled && 'bg-card'
			)}
		>
			<span className="w-[5rem] shrink-0 text-left ">{defaultValue}</span>
			<Popover className="group grow">
				{() => (
					<>
						<PopoverButton
							className="w-full flex items-center gap-2 justify-end h-full outline-none"
							ref={buttonRef}
							disabled={disableButton}
							onClick={toggleDisabled}
							as="div"
						>
							{isTeamManager && (
								<button
									className={`flex mr-[0.5rem] gap-3 outline-none`}
									disabled={false}
									onClick={() => {
										setDisabled(!disabled);
									}}
								>
									<EditPenUnderlineIcon className="size-4 text-muted-foreground" />
								</button>
							)}
						</PopoverButton>
						<Transition
							as="div"
							enter="transition ease-out duration-200"
							enterFrom="opacity-0 translate-y-1"
							enterTo="opacity-100 translate-y-0"
							leave="transition ease-in duration-150"
							leaveFrom="opacity-100 translate-y-0"
							leaveTo="opacity-0 translate-y-1"
							show={!disabled}
						>
							<PopoverPanel
								ref={panelRef}
								anchor="bottom end"
								className="z-50 mt-2 flex flex-col gap-2 rounded-xl bg-popover p-3 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5"
							>
								<div className="text-sm font-medium text-muted-foreground">
									{t('form.SELECT_TEAM_SIZE')}
								</div>
								{/* Divider */}
								<div className="h-px bg-border"></div>
								<div className="flex flex-col hover:cursor-pointer">
									{sizeOption.map((size, index) => {
										return (
											<div
												key={index}
												className={clsxm(
													'flex items-center gap-3 rounded-md px-3 py-1.5 transition-colors hover:bg-foreground/5',
													size.name === value && 'bg-primary/10 hover:bg-primary/10'
												)}
												onClick={() => onSelect(size.name)}
											>
												<div
													className={clsxm(
														'text-sm font-medium text-foreground',
														size.name === value && 'text-primary-ink'
													)}
												>
													{size.name}
												</div>
											</div>
										);
									})}
								</div>
								{/* Divider */}
								<div className="h-px bg-border"></div>
								<div className="flex items-center justify-end gap-2">
									<Button
										variant="outline"
										size="default"
										className="min-w-[90px]"
										type="submit"
										onClick={handleClose}
										disabled={loading}
									>
										{t('common.CANCEL')}
									</Button>
									<Button
										variant="primary"
										size="default"
										className="min-w-[90px]"
										type="submit"
										onClick={handleSave}
										disabled={loading}
									>
										{loading && <Spinner className="size-4 animate-spin" />}
										{!loading && t('common.SAVE')}
									</Button>
								</div>
							</PopoverPanel>
						</Transition>
					</>
				)}
			</Popover>
		</div>
	);
};

export default TeamSize;
