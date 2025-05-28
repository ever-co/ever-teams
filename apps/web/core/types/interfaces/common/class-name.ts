export type IClassName<T = object> = {
	className?: string;
	fullWidth?: boolean;
	showTimerButton?: boolean;
	type?: 'VERTICAL' | 'HORIZONTAL';
} & T;
