import { Button } from '@/core/components/duplicated-components/_button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/common/card';
import { SidebarInput, useSidebar } from '@/core/components/common/sidebar';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/core/components/common/form';
import { ToastAction } from '../common/toast';
import { toast } from '../../hooks/common/use-toast';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

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
		const tags = ['Ever Teams, Ever Teams App', 'Open', 'Cloud'];
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
				description: `We have encountered a problem ${error} with your registration to our waiting list for Ever Teams`,
				variant: 'destructive'
			});
			return;
		}

		setLoading(() => false);
		toast({
			title: 'Confirmation of registration on waiting list',
			description: "Thank you for joining our waiting list! We're delighted you're interested in Ever Teams",
			variant: 'default',
			className: 'bg-green-50 text-green-600 border-green-500',
			action: <ToastAction altText="Goto Waitlist to undo">Undo</ToastAction>
		});
	};

	const onSubmit = (data: z.infer<typeof subscribeFormSchema>) => {
		console.log(data);
		(async () => await subscribe())();
	};

	return state == 'expanded' ? (
		<Form {...form}>
			<Card className="p-1 mt-auto shadow-none bg-light--theme-light dark:bg-dark--theme-light ">
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardHeader className="flex flex-col gap-1 p-4 pb-0">
						<CardTitle className="text-sm font-medium">{t('common.SUBSCRIBE_NEWSLETTER')}</CardTitle>
						<CardDescription className="text-xs">{t('common.OPT_IN_UPDATES')}</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2.5 p-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<SidebarInput
											type="email"
											placeholder="Email"
											className="border-gray-200 placeholder:text-xs dark:bg-gray-800 dark:border-gray-700"
											{...field}
										/>
									</FormControl>
									<FormMessage className="text-xs" />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="w-full shadow-none bg-sidebar-primary text-sidebar-primary-foreground"
							size="sm"
						>
							{isLoading ? 'Subscribing...' : 'Subscribe'}
						</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	) : null;
}
