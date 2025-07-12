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
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
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
					<div className="col-span-full min-h-[600px]">
						<AnimatedEmptyState
							title="No Projects Yet"
							message={
								<>
									<p>Ready to start something amazing?</p>
									<p className="text-sm text-gray-500 mt-1">
										Create your first project and begin collaborating with your team.
									</p>
								</>
							}
						/>
					</div>
				)}
			</div>
			<div className="dark:bg-dark--theme px-4 py-4 flex">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1} // Set Static to 1 - It will be calculated dynamically in Paginate component
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
