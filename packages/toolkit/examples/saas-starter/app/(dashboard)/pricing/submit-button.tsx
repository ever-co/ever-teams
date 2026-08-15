'use client';

import { Button } from '@ever-teams/toolkit-ui';
import { ArrowRight, Loader2 } from 'lucide-react';
import { JSX } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';

export function SubmitButton(): JSX.Element {
	const { pending } = useFormStatus();
	const t = useTranslations('Pricing');

	return (
		<Button
			type="submit"
			disabled={pending}
			className="w-full bg-white hover:bg-gray-100 text-black border border-gray-200 rounded-full flex items-center justify-center"
		>
			{pending ? (
				<>
					<Loader2 className="animate-spin mr-2 h-4 w-4" />
					Loading...
				</>
			) : (
				<>
					{t('get_started')}
					<ArrowRight className="ml-2 h-4 w-4" />
				</>
			)}
		</Button>
	);
}
