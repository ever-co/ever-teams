import { Dispatch, SetStateAction, useCallback } from 'react';
import { ProjectViewDataType } from '..';
import GridItem from './grid-item';
import { useTranslations } from 'next-intl';
import { ProjectsGridSkeleton } from './grid-skeleton';

interface IProps {
	selectedProjects: Record<string, boolean>;
	setSelectedProjects: Dispatch<SetStateAction<Record<string, boolean>>>;
	projects: ProjectViewDataType[];
	loading: boolean;
}

export function ProjectsGridView(props: IProps) {
	const { projects = [], selectedProjects, loading, setSelectedProjects } = props;
	const t = useTranslations();

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
		<div key="grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
			{loading ? (
				<ProjectsGridSkeleton />
			) : projects.length > 0 ? (
				projects.map((el) => (
					<GridItem
						onSelect={handleSelectProject}
						isSelected={!!selectedProjects[el.project.id]}
						key={el.project.id}
						data={el}
					/>
				))
			) : (
				<div className="w-full h-full flex pb-6 items-center justify-center">
					<span>{t('common.NO_RESULT')}</span>
				</div>
			)}
		</div>
	);
}
