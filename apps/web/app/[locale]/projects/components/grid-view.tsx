import { ProjectTableDataType } from './data-table';
import GridItem from './grid-item';

interface IProps {
	data: ProjectTableDataType[];
}

export default function ProjectsGridView(props: IProps) {
	const { data } = props;

	return (
		<div className=" w-full flex-wrap flex gap-3">
			{data.map((el) => (
				<GridItem key={el.project.name} data={el} />
			))}
		</div>
	);
}
