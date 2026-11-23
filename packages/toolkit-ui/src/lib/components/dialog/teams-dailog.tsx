import { Button } from '../button';
import { cn } from '../../utils/utils';
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
	// Keeps the title for screen readers only, when the content already shows the same heading.
	hideTitle?: boolean;
	children?: React.ReactNode;
}

// The dialog library links a dialog to a description it expects, and warns in the console, in production too, when
// none is drawn: a dialog without one says so (#5642).
function descriptionPropsOf(description?: string): { 'aria-describedby'?: undefined } {
	if (description) {
		return {};
	}
	return { 'aria-describedby': undefined };
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
	hideTitle = false,
	footer,
	...props
}: IModal) {
	const hasHeader = Boolean(title || description);
	// hideTitle hides the title only: a description stays visible. With no description the whole header is hidden, so
	// that the empty header takes no room in the dialog's layout.
	let headerClass: string | undefined;
	if (hideTitle && !description) {
		headerClass = 'sr-only';
	}
	return (
		<ShadCnDialog open={open} defaultOpen={defaultOpen} modal={modal} onOpenChange={onOpenChange} {...props}>
			<DialogTrigger className={className} asChild>
				{trigger}
			</DialogTrigger>
			<DialogContent className="w-full sm:max-w-[425px]" {...descriptionPropsOf(description)}>
				{hasHeader && (
					<DialogHeader className={headerClass}>
						<DialogTitle className={cn(titleClass, hideTitle && 'sr-only')}>{title}</DialogTitle>
						{description && <DialogDescription>{description}</DialogDescription>}
					</DialogHeader>
				)}
				{children}
				{footer && <DialogFooter>{footer}</DialogFooter>}
			</DialogContent>
		</ShadCnDialog>
	);
}
