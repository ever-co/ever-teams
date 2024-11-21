import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInput, useSidebar } from '@/components/ui/sidebar';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

export function SidebarOptInForm() {
	const { state } = useSidebar();
	const subscribeFormSchema = z
		.object({
			email: z.string().email()
		})
		.required();
	const form = useForm<z.infer<typeof subscribeFormSchema>>({
		resolver: zodResolver(subscribeFormSchema)
	});
	const onSubmit = (data: z.infer<typeof subscribeFormSchema>) => {
		console.log(data);
	};
	return state == 'expanded' ? (
		<Form {...form}>
			<Card className="p-1 mt-auto shadow-none">
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardHeader className="flex flex-col gap-1 p-4 pb-0">
						<CardTitle className="text-sm font-medium">Subscribe to our newsletter</CardTitle>
						<CardDescription className="text-xs">
							Opt-in to receive updates and news about Ever Teams.
						</CardDescription>
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
											className="placeholder:text-xs"
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
							Subscribe
						</Button>
					</CardContent>
				</form>
			</Card>
		</Form>
	) : null;
}
