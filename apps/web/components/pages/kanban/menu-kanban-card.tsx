import { useTeamMemberCard } from '@app/hooks';
import { activeTeamTaskId } from '@app/stores';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { ThreeCircleOutlineVerticalIcon } from 'assets/svg';
import { HorizontalSeparator, SpinnerLoader } from 'lib/components';
import { PlanTask } from 'lib/features/task/task-card';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSetRecoilState } from 'recoil';

export default function MenuKanbanCard({ member, item }: { item: any; member: any }) {
	const t = useTranslations();
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading } = useTeamMemberCard(member);
	const setActiveTask = useSetRecoilState(activeTeamTaskId);
	const [load, setLoad] = useState<'' | 'assign' | 'unassign'>('');
	const menu = [
		{
			name: t('common.EDIT_TASK'),
			closable: true,
			action: 'edit',
			active: true,
			onClick: () => {
				setActiveTask({
					id: item.id
				});
			}
		},
		{
			name: t('common.ESTIMATE'),
			closable: true,
			action: 'estimate',
			onClick: () => {
				// TODO: Implement estimate task after fixing the time estimate issue
			},
			active: true
		},
		{
			name: t('common.ASSIGN_TASK'),
			action: 'assign',
			active: true,
			onClick: () => {
				setLoad('assign');
				assignTask(item);
			}
		},
		{
			name: t('common.UNASSIGN_TASK'),
			action: 'unassign',
			closable: true,
			active: true,
			onClick: () => {
				setLoad('unassign');
				unassignTask(item);
			}
		}
	].filter((item) => item.active || item.active === undefined);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button>
					<ThreeCircleOutlineVerticalIcon className="w-4 h-4 z-50" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-40 border-[0.125rem] dark:border-[#26272C] bg-white dark:bg-dark--theme-light p-0"
			>
				<ul>
					{menu.map((item) => {
						return (
							<li key={item.name} onClick={() => item?.onClick()}>
								<button className="font-normal flex justify-between capitalize hover:bg-secondary-foreground/20 w-full text-left whitespace-nowrap text-sm hover:font-semibold hover:transition-all p-2">
									<p>{item.name}</p>
									{(item.action == 'assign' && load == 'assign' && assignTaskLoading) ||
									(item.action == 'unassign' && load == 'unassign' && unAssignTaskLoading) ? (
										<SpinnerLoader size={20} />
									) : null}
								</button>
							</li>
						);
					})}
				</ul>
				<HorizontalSeparator />
				<div className="mt-3 text-xs p-2">
					<ul className="list-none">
						<li className="mb-2">
							<PlanTask planMode="today" taskId={item.id} chooseMember={true} />
						</li>
						<li className="mb-2">
							<PlanTask planMode="tomorow" taskId={item.id} chooseMember={true} />
						</li>
						<li className="mb-2">
							<PlanTask planMode="custom" taskId={item.id} chooseMember={true} />
						</li>
					</ul>
				</div>
			</PopoverContent>
		</Popover>
	);
}
