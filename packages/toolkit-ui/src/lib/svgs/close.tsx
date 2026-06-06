import { cn } from "../utils/utils";

function CloseIcon({ size = 24, className, ...props }: { size: number; className?: string; }) {
	return (
		<svg
			{...props}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			className={cn(className, "text-slate-900 dark:text-white")}
		>
			<path
				d="M15.7128 16.7716L7.22748 8.2863C6.93757 7.99639 6.93757 7.51556 7.22748 7.22564C7.5174 6.93573 7.99823 6.93573 8.28814 7.22564L16.7734 15.7109C17.0633 16.0008 17.0633 16.4817 16.7734 16.7716C16.4835 17.0615 16.0027 17.0615 15.7128 16.7716Z"
				fill="currentColor"
			/>
			<path
				d="M7.22658 16.7716C6.93666 16.4817 6.93666 16.0008 7.22658 15.7109L15.7119 7.22564C16.0018 6.93573 16.4826 6.93573 16.7725 7.22564C17.0624 7.51556 17.0624 7.99639 16.7725 8.2863L8.28724 16.7716C7.99732 17.0615 7.51649 17.0615 7.22658 16.7716Z"
				fill="currentColor"
			/>
		</svg>
	);
}

export { CloseIcon };
