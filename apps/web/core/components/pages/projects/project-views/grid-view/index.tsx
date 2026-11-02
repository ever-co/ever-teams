import { Dispatch, SetStateAction, useCallback } from 'react';
import { ProjectViewDataType } from '..';
import GridItem from './grid-item';
import { ProjectsGridSkeleton } from './grid-skeleton';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Paginate } from '@/core/components/duplicated-components/_pagination';
import { usePagination } from '@/core/hooks/common/use-pagination';

interface IProps {
	selectedProjects: Record<string, boolean>;
	setSelectedProjects: Dispatch<SetStateAction<Record<string, boolean>>>;
	projects: ProjectViewDataType[];
	loading: boolean;
}

export function ProjectsGridView(props: IProps) {
	const { projects = [], selectedProjects, loading, setSelectedProjects } = props;

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ProjectViewDataType>({ items: projects });

	const handleSelectProject = useCallback(
		(projectId: string) => {
			setSelectedProjects((prevSelectedProjects) => {
				const newSelectedProjects = { ...prevSelectedProjects };
				if (newSelectedProjects[projectId]) {
					delete newSelectedProjects[projectId];
				} else {
					newSelectedProjects[projectId] = true;
				}
				return newSelectedProjects;
			});
		},
		[setSelectedProjects]
	);

	return (
		<div key="grid" className="w-full h-full">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{loading ? (
					<ProjectsGridSkeleton />
				) : currentItems.length > 0 ? (
					currentItems.map((el) => (
						<GridItem
							onSelect={handleSelectProject}
							isSelected={!!selectedProjects[el.project.id]}
							key={el.project.id}
							data={el}
						/>
					))
				) : (
					<div className="col-span-full flex min-h-[600px] items-center justify-center rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
						<AnimatedEmptyState
							title="No Projects Yet"
							showBorder={false}
							message={
								<>
									<p>Ready to start something amazing?</p>
									<p className="mt-1 text-sm text-muted-foreground">
										Create your first project and begin collaborating with your team.
									</p>
								</>
							}
						/>
					</div>
				)}
			</div>
			<div className="flex px-4 py-4">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={Math.ceil(total / itemsPerPage)}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="pt-0"
				/>
			</div>
		</div>
	);
}
