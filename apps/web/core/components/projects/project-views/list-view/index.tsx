import { ProjectViewDataType } from '..';
import { ProjectsTable } from './data-table';
import { Paginate } from '@/core/components';
import { usePagination } from '@/core/hooks/features/usePagination';
import { OnChangeFn, VisibilityState } from '@tanstack/react-table';
import { Dispatch, SetStateAction } from 'react';

interface IProps {
	selectedProjects: Record<string, boolean>;
	setSelectedProjects: Dispatch<SetStateAction<Record<string, boolean>>>;
	projects: ProjectViewDataType[];
	loading: boolean;
	columnVisibility: VisibilityState;
	onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

export function ProjectsListView(props: IProps) {
	const { loading, projects, columnVisibility, onColumnVisibilityChange, selectedProjects, setSelectedProjects } =
		props;

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ProjectViewDataType>(projects);

	return (
		<div key="list" className=" w-full h-full">
			<ProjectsTable
				columnVisibility={columnVisibility}
				onColumnVisibilityChange={onColumnVisibilityChange}
				loading={loading}
				data={currentItems}
				selectedProjects={selectedProjects}
				onSelectedProjectsChange={setSelectedProjects}
			/>
			<div className=" dark:bg-dark--theme px-4 py-4 flex">
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
