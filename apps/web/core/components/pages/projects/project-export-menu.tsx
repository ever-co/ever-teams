import { Button } from '@/core/components/duplicated-components/_button';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PDFDocument } from '@/core/components/pages/projects/export-formats/pdf';
import { ProjectViewDataType } from './project-views';
import moment from 'moment';
import { TOrganizationTeam } from '@/core/types/schemas';
import { useState, Suspense } from 'react';
import { ExportPDFSkeleton } from '@/core/components/common/skeleton/export-pdf-skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';

interface IProps {
	projects: ProjectViewDataType[];
	activeTeam: TOrganizationTeam | null;
}

export function ProjectExportMenu(props: IProps) {
	const { projects, activeTeam } = props;
	const [isOpen, setIsOpen] = useState(false);

	const t = useTranslations();

	// Prepare PDF data outside of render to avoid re-computation
	const pdfData = (projects || []).map((el) => {
		try {
			return {
				projectName: el?.project?.name || '-',
				status: el?.status || '-',
				archivedAt: el?.archivedAt ? moment(el.archivedAt).format('YYYY-MM-DD') : '-',
				startDate: el?.startDate ? moment(el.startDate).format('YYYY-MM-DD') : '-',
				endDate: el?.endDate ? moment(el.endDate).format('YYYY-MM-DD') : '-',
				members: Array.isArray(el?.members)
					? el.members.map((member) => member?.employee?.fullName || '').filter(Boolean)
					: [],
				managers: Array.isArray(el?.managers)
					? el.managers.map((manager) => manager?.employee?.fullName || '').filter(Boolean)
					: [],
				teams: Array.isArray(el?.teams) ? el.teams.map((team) => team?.name || '').filter(Boolean) : []
			};
		} catch (error) {
			console.error('Error processing project data for PDF:', error);
			return {
				projectName: 'Error',
				status: '-',
				archivedAt: '-',
				startDate: '-',
				endDate: '-',
				members: [],
				managers: [],
				teams: []
			};
		}
	});

	const pdfHeaders = {
		projectName: t('pages.projects.projectTitle.SINGULAR'),
		status: t('common.STATUS'),
		archivedAt: t('common.ARCHIVE_AT'),
		startDate: t('common.START_DATE'),
		endDate: t('common.END_DATE'),
		members: t('common.MEMBERS'),
		managers: t('common.MANAGERS'),
		teams: t('common.TEAMS')
	};

	const pdfTitle = `${activeTeam?.name || 'Organization'} Projects`;
	const pdfFileName = `${activeTeam?.name || 'organization'}-projects.pdf`;

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					className="border-gray-200 text-sm hover:bg-slate-100 min-w-fit text-black h-[2.2rem] font-light hover:dark:bg-transparent"
					variant="outline"
				>
					<span>{t('common.EXPORT')}</span>
					<ChevronDown size={15} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-40" align="center">
				<DropdownMenuItem className="cursor-pointer" asChild>
					{isOpen ? (
						<Suspense fallback={<ExportPDFSkeleton />}>
							<PDFDownloadLink
								className="w-full h-full pl-2 text-left"
								document={<PDFDocument data={pdfData} headers={pdfHeaders} title={pdfTitle} />}
								fileName={pdfFileName}
							>
								{({ loading }) =>
									loading ? (
										<span className="w-full h-full">{t('common.LOADING')}...</span>
									) : (
										<span className="w-full h-full">PDF</span>
									)
								}
							</PDFDownloadLink>
						</Suspense>
					) : (
						<span className="w-full h-full">PDF</span>
					)}
				</DropdownMenuItem>
				<DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
					<span className="text-sm">CSV</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
