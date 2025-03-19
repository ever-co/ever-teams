import { Dispatch, SetStateAction, useCallback } from 'react';
import { ProjectViewDataType } from '..';
import GridItem from './grid-item';
import { SpinnerLoader } from '@/lib/components';
import { useTranslations } from 'next-intl';

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
		<div key="grid" className="flex-wrap flex gap-3">
			{loading ? (
				<div className="w-full h-full flex items-center justify-center">
					<SpinnerLoader />
				</div>
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
