'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle, floatingSheetSurface } from '@/core/components/common/sheet';
import { ProjectInfoSheetSkeleton } from '@/core/components/projects/dialogs/project-dialog-skeletons';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { cn } from '@/core/lib/helpers';

const LazyProjectInfoSheet = dynamic(
	() => import('@/core/components/projects/project-info-sheet').then((module) => module.ProjectInfoSheet),
	{ ssr: false, loading: () => <ProjectInfoSheetSkeleton /> }
);

const PROJECT_SHEET_SURFACE = cn(floatingSheetSurface, 'w-[min(38rem,calc(100vw-1rem))]');

interface IViewProjectInfoModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

export function ViewProjectInfoModal({ open, closeModal, projectId }: Readonly<IViewProjectInfoModalProps>) {
	const t = useTranslations();
	const popupRef = useRef<HTMLDivElement>(null);
	const { organizationProjects } = useOrganizationProjectsQuery();
	const project = organizationProjects.find((item) => item.id === projectId);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			closeModal();
		}
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent
				ref={popupRef}
				side="right"
				showCloseButton={false}
				initialFocus={popupRef}
				className={PROJECT_SHEET_SURFACE}
			>
				{project && <LazyProjectInfoSheet project={project} onClose={closeModal} />}
				{!project && (
					<>
						<SheetTitle className="sr-only">{t('pages.projects.modals.info.title')}</SheetTitle>
						<ProjectInfoSheetSkeleton />
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
