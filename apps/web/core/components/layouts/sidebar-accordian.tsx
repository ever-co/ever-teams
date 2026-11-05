import { Disclosure } from '@headlessui/react';
import { ChevronUp as ChevronUpIcon } from '@/core/components/icons';
import { clsxm } from '@/core/lib/utils';
import { Text } from '../common/typography';

interface isProps {
	title: any;
	children?: React.ReactNode;
	className: string;
	wrapperClassName?: string;
	textClassName?: string;
	defaultOpen?: boolean;
	/** When provided, accordion is controlled: open state is driven by this prop (no remount). */
	open?: boolean;
	onHeaderClick?: () => void;
}

const panelClassName = 'px-4 pt-2 pb-2 text-sm text-muted-foreground';

function headerButtonClassName(open: boolean, wrapperClassName?: string) {
	return clsxm(
		'flex w-full items-center justify-between rounded-md px-4 py-2 text-left font-medium transition-colors',
		wrapperClassName,
		'pt-[0.15rem] pb-0',
		open && 'bg-foreground/5 text-primary-ink'
	);
}

function chevronClassName(open: boolean) {
	return clsxm('size-4 text-muted-foreground transition-transform duration-150', !open && 'rotate-180');
}

export const SidebarAccordian = ({
	children,
	title,
	className,
	wrapperClassName,
	textClassName,
	defaultOpen = true,
	open: controlledOpen,
	onHeaderClick
}: isProps) => {
	const isControlled = controlledOpen !== undefined;
	const open = isControlled ? controlledOpen : undefined;

	if (isControlled) {
		return (
			<div className="w-full">
				<div className={clsxm('rounded-xl bg-transparent', className)}>
					<div>
						<button
							type="button"
							aria-expanded={open}
							onClick={() => onHeaderClick?.()}
							className={headerButtonClassName(Boolean(open), wrapperClassName)}
						>
							<Text
								className={clsxm(
									'flex items-center gap-2 text-center text-sm sm:text-left',
									textClassName
								)}
							>
								{title}
							</Text>
							<ChevronUpIcon className={chevronClassName(Boolean(open))} />
						</button>
						{children && open && <div className={panelClassName}>{children}</div>}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full">
			<div className={clsxm('rounded-xl bg-transparent', className)}>
				<Disclosure defaultOpen={defaultOpen}>
					{({ open }) => (
						<div>
							<Disclosure.Button
								onClick={() => onHeaderClick?.()}
								className={headerButtonClassName(Boolean(open), wrapperClassName)}
							>
								<Text
									className={clsxm(
										'flex items-center gap-2 text-center text-sm sm:text-left',
										textClassName
									)}
								>
									{title}
								</Text>

								<ChevronUpIcon className={chevronClassName(Boolean(open))} />
							</Disclosure.Button>
							{children && <Disclosure.Panel className={panelClassName}>{children}</Disclosure.Panel>}
						</div>
					)}
				</Disclosure>
			</div>
		</div>
	);
};
