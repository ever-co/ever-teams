import { Paginate } from '@/lib/components';
import { DataTableProject, ProjectTableDataType } from './data-table';
import { usePagination } from '@/app/hooks/features/usePagination';

interface IProps {
	data: ProjectTableDataType[];
}

export default function ProjectsListView(props: IProps) {
	const { data } = props;

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<ProjectTableDataType>(data);

	return (
		<div className="w-full">
			<DataTableProject data={currentItems} />
			<div className=" bg-white dark:bg-dark--theme px-4 py-4 flex">
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
