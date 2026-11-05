import { Button } from '@/core/components/duplicated-components/_button';
import { SidebarInput, useSidebar } from '@/core/components/common/sidebar';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/core/components/common/form';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { ArrowRight, Mail, Spinner } from '@/core/components/icons';
import { APP_NAME } from '@/core/constants/config/constants';
import { toastMoment } from '@/core/components/common/toast-moment';

/** A white card on a hairline whose fill leans toward the brand hue at its foot, as the tooltip bubbles do. */
const OPT_IN_CARD =
	'rounded-xl bg-linear-to-b from-card to-[color-mix(in_oklab,hsl(var(--card)),hsl(var(--primary))_7%)] p-3 hairline-ring ring-border shadow-[0_1px_2px_rgb(0_0_0/0.04)]';

const OPT_IN_TILE =
	'keycap-3d flex size-7 shrink-0 items-center justify-center rounded-lg text-foreground/70 [&_svg]:size-4';

/**
 * Newsletter opt-in at the foot of the sidebar: a small card with its icon tile, the title and one line of copy,
 * then the e-mail field and the send button on a single row so it never crowds the account menu below it. Hidden
 * while the sidebar is collapsed to its icon rail.
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

	const showSubscribeError = (error: unknown) => {
		const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
		toast.error(t('toasts.common.NEWSLETTER_FAILED'), { description: t(reasonKey) });
	};

	const showSubscribed = (listStatus: string | undefined, email: string) => {
		const awaitsConfirmation = listStatus === 'pending';
		if (awaitsConfirmation) {
			toast.info(t('toasts.common.NEWSLETTER_CONFIRMATION_SENT', { email }));
			return;
		}
		toastMoment(t('toasts.common.NEWSLETTER_SUBSCRIBED'), <Mail />);
	};

	const subscribe = async () => {
		setLoading((prev) => true);
		const email = form.getValues('email');
		try {
			// The route sets the list status and tags itself.
			const res = await fetch('/api/subscribe', {
				body: JSON.stringify({
					email_address: email
				}),
				headers: {
					'Content-Type': 'application/json'
				},
				method: 'POST'
			});
			const { error, status } = (await res.json()) as {
				error: string;
				status?: string;
				[key: string]: unknown;
			};

			if (error) {
				showSubscribeError({ status: res.status });
				return;
			}

			showSubscribed(status, email);
		} catch (error) {
			showSubscribeError(error);
		} finally {
			setLoading(false);
		}
	};

	const onSubmit = (data: z.infer<typeof subscribeFormSchema>) => {
		console.log(data);
		(async () => await subscribe())();
	};

	const subscribeLabel = isLoading ? t('common.SUBSCRIBING') : t('common.SUBSCRIBE');

	return state == 'expanded' ? (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className={OPT_IN_CARD}>
				<div className="flex items-start gap-2.5">
					<span className={OPT_IN_TILE} aria-hidden="true">
						<Mail />
					</span>
					<div className="min-w-0">
						<p className="text-xs font-semibold text-foreground">{t('common.SUBSCRIBE_NEWSLETTER')}</p>
						<p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
							{t('common.OPT_IN_UPDATES', { appName: APP_NAME })}
						</p>
					</div>
				</div>
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
										className="h-8 min-w-0 flex-1 text-xs placeholder:text-xs"
										{...field}
									/>
									<Button
										type="submit"
										variant="outline"
										size="icon"
										className="shrink-0 text-muted-foreground hover:text-foreground"
										disabled={isLoading}
										aria-label={subscribeLabel}
										title={subscribeLabel}
									>
										{isLoading ? (
											<Spinner className="size-3.5 animate-spin" aria-hidden="true" />
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
