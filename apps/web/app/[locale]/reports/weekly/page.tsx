"use client"

import React from "react";
import { useOrganizationTeams } from "@/app/hooks";
import { clsxm } from "@/app/utils";
import { withAuthentication } from "@/lib/app/authenticator";
import ChatwootWidget from "@/lib/features/integrations/chatwoot";
import { MainLayout } from "@/lib/layout";
import { useAtomValue } from "jotai";
import { fullWidthState } from "@/app/stores/fullWidth";
import { Breadcrumb, Container } from "@/lib/components";
import { DatePicker } from "@components/ui/DatePicker";
// import { useTranslations } from "next-intl";


const WeeklyLimit = () => {
	// const t = useTranslations();
	const [headerSize, setHeaderSize] = React.useState(10);
	const { isTrackingEnabled } = useOrganizationTeams();
	const fullWidth = useAtomValue(fullWidthState);

	const breadcrumb = [
		{ title: 'Reports', href: '/' },
		{ title: 'Weekly limit', href: '/reports/weekly' }
	];
	return (
		<>
			<div className="flex flex-col justify-between h-full min-h-screen bg-white dark:bg-dark">
				<MainLayout
					showTimer={headerSize <= 11.8 && isTrackingEnabled}
					className="h-full"
					footerClassName={clsxm('')}
				>
					<Container className="mx-auto" fullWidth={fullWidth}>
						<Breadcrumb paths={breadcrumb} className="text-sm my-4 px-2" />
						<div className="flex justify-between">
							<h2 className="text-5xl">Weekly Limit</h2>
							<div>
								filters
							</div>
						</div>
						<div className="flex my-2 gap-4">
							<span>Group By</span>
							<DatePicker customInput={<div>Date</div>}  />
						</div>
					</Container>
					<ChatwootWidget />
				</MainLayout>
			</div>
		</>
	)
}

export default withAuthentication(WeeklyLimit, { displayName: 'WeeklyLimit' });
