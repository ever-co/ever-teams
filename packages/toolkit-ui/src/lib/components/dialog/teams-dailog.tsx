import { Button } from '../button';
import {
	ShadCnDialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './dialog';

interface IModal extends React.ComponentProps<typeof ShadCnDialog> {
	className?: string;
	trigger?: React.ReactNode;
	title?: string;
	description?: string;
	footer?: string;
	titleClass?: string;
	children?: React.ReactNode;
}

export function Dialog({
	open,
	children,
	defaultOpen,
	modal,
	onOpenChange,
	className,
	trigger = <Button variant="outline">Open Modal</Button>,
	title,
	description,
	titleClass,
	footer,
	...props
}: IModal) {
	return (
		<ShadCnDialog open={open} defaultOpen={defaultOpen} modal={modal} onOpenChange={onOpenChange} {...props}>
			<DialogTrigger className={className} asChild>
				{trigger}
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-[425px]">
				{title ||
					(description && (
						<DialogHeader>
							<DialogTitle>{title}</DialogTitle>
							{description && <DialogDescription>{description}</DialogDescription>}
						</DialogHeader>
					))}
				{children}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</ShadCnDialog>
	);
}
