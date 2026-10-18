import { Button } from '@/core/components/duplicated-components/_button';
import { SidebarInput, useSidebar } from '@/core/components/common/sidebar';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/core/components/common/form';
import { ToastAction } from '../common/toast';
import { toast } from '../../hooks/common/use-toast';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Loader2 } from 'lucide-react';
import { APP_NAME } from '@/core/constants/config/constants';

/**
 * Newsletter opt-in at the foot of the sidebar: one quiet bordered block the width of the nav,
 * with the e-mail field and the send button on a single row so it never crowds the account menu
 * below it. Hidden while the sidebar is collapsed to its icon rail.
 */
export function SidebarOptInForm() {
	const t = useTranslations();
	const { state } = useSidebar();
	const [isLoading, setLoading] = useState(false);
	const subscribeFormSchema = z
		.object({
			email: z.string().email()
		})
		.required();
	const form = useForm<z.infer<typeof subscribeFormSchema>>({
		resolver: zodResolver(subscribeFormSchema)
	});

	const subscribe = async () => {
		const appName = APP_NAME;
		const tags = [`${appName}, ${appName} App`, 'Open', 'Cloud'];
		setLoading((prev) => true);
		const res = await fetch('/api/subscribe', {
			body: JSON.stringify({
				email_address: form.getValues('email'),
				captcha: '',
				tags: tags,
				status: 'subscribed'
			}),
			headers: {
				'Content-Type': 'application/json'
			},
			method: 'POST'
		});
		const { error } = (await res.json()) as {
			error: string;
			status: number;
			[key: string]: unknown;
		};

		if (error) {
			setLoading((prev) => false);
			toast({
				title: 'Waiting list registration error',
				description: `We have encountered a problem ${error} with your registration to our waiting list for ${APP_NAME}`,
				variant: 'destructive'
			});
			return;
		}

		setLoading(() => false);
		toast({
			title: 'Confirmation of registration on waiting list',
			description: `Thank you for joining our waiting list! We're delighted you're interested in ${APP_NAME}`,
			variant: 'default',
			className: 'bg-green-50 text-green-600 border-green-500',
			action: <ToastAction altText="Goto Waitlist to undo">Undo</ToastAction>
		});
	};

	const onSubmit = (data: z.infer<typeof subscribeFormSchema>) => {
		console.log(data);
		(async () => await subscribe())();
	};

	const subscribeLabel = isLoading ? t('common.SUBSCRIBING') : t('common.SUBSCRIBE');

	return state == 'expanded' ? (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="rounded-lg border border-sidebar-border bg-black/[0.02] p-3 dark:bg-white/[0.03]"
			>
				<p className="text-xs font-medium text-foreground">{t('common.SUBSCRIBE_NEWSLETTER')}</p>
				<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
					{t('common.OPT_IN_UPDATES', { appName: APP_NAME })}
				</p>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem className="mt-2.5">
							<FormControl>
								<div className="flex items-center gap-1.5">
									<SidebarInput
										type="email"
										placeholder={t('common.EMAIL')}
										className="h-8 min-w-0 flex-1 rounded-md border-sidebar-border bg-background text-xs placeholder:text-xs"
										{...field}
									/>
									<Button
										type="submit"
										variant="outline"
										size="icon"
										className="size-8 shrink-0 rounded-md border-sidebar-border bg-background text-muted-foreground hover:text-foreground"
										disabled={isLoading}
										aria-label={subscribeLabel}
										title={subscribeLabel}
									>
										{isLoading ? (
											<Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
										) : (
											<ArrowRight className="size-3.5" aria-hidden="true" />
										)}
									</Button>
								</div>
							</FormControl>
							<FormMessage className="text-[11px]" />
						</FormItem>
					)}
				/>
			</form>
		</Form>
	) : null;
}
