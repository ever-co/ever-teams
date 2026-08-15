import { toast } from '../components/toast/use-toast';

export interface IServerError {
	message: string | string[];
	error: string;
	statusCode: number;
}

export function getErrorMessage(error: unknown) {
	const message = 'Unknown error';
	if (error instanceof Error) return error.message;
	return message;
}

export function reportError(message: string | string[]) {
	toast({
		title: 'Ever Teams Error',
		description: typeof message == 'string' ? message : message[0],
		variant: 'destructive',
		className: 'rounded-lg'
	});
}
