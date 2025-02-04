'use client';

import { MainLayout } from '@/lib/layout';
import { useOrganizationTeams } from '@/app/hooks';
import { withAuthentication } from '@/lib/app/authenticator';
import { useMemo, useState } from 'react';
import { Grid, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/lib/components';

type TViewMode = 'GRID' | 'LIST';

function PageComponent() {
	const { isTrackingEnabled } = useOrganizationTeams();
	const [selectedView, setSelectedView] = useState<TViewMode>('LIST');

	const viewItems: { title: string; name: TViewMode; icon: any }[] = useMemo(
		() => [
			{
				title: 'List view',
				name: 'LIST',
				icon: List
			},

			{
				title: 'Grid view',
				name: 'GRID',
				icon: Grid
			}
		],
		[]
	);

	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className=" text-3xl font-medium">Projects</h3>
						</div>
						<div className=" h-14 flex items-center justify-between w-full">
							<div className="w-[20rem] h-full flex items-end justify-center">
								<ul className="flex relative text-lg w-full justify-evenly">
									{viewItems.map((item, index) => (
										<li
											onClick={() => setSelectedView(item.name)}
											key={index}
											className={cn(
												'w-[10rem] cursor-pointer gap-2 flex items-center justify-center',
												selectedView == item.name ? ' text-primary' : ' text-slate-500'
											)}
										>
											<item.icon className="h-4 w-4" />
											<span>{item.title}</span>
										</li>
									))}
									<div
										className={cn(
											'w-1/2 absolute z-[20] -bottom-[1.125rem] h-[.125rem] transition-all bg-primary',
											selectedView == 'LIST' ? 'left-0' : 'left-[10rem]'
										)}
									></div>
								</ul>
							</div>

							<div className="h-full flex items-end">
								<Button variant="grey" className=" text-primary font-medium">
									<Plus size={15} /> <span>New project</span>
								</Button>
							</div>
						</div>
					</div>
				</div>
			}
		></MainLayout>
	);
}

export default withAuthentication(PageComponent, { displayName: 'ProjectPage' });
