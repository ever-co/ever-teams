'use client';

import ReactPDF from '@react-pdf/renderer';

import { MainLayout } from '@/lib/layout';
import { useOrganizationTeams } from '@/app/hooks';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PDFProjectExportDocument } from '../components/exports/pdf';

function Page() {
	const { isTrackingEnabled } = useOrganizationTeams();
	return (
		<MainLayout
			showTimer={isTrackingEnabled}
			className="!p-0 pb-1 !overflow-hidden w-full"
			childrenClassName="w-full h-full"
			mainHeaderSlot={
				<div className="flex flex-col p-4 dark:bg-dark--theme">
					<div className="flex flex-col items-start justify-between gap-3">
						<div className="flex items-center justify-center h-10 gap-8">
							<h3 className=" text-3xl font-medium">Project</h3>
						</div>
					</div>
				</div>
			}
		>
			<div className="my-20">
				<PDFDownloadLink document={<PDFProjectExportDocument />} fileName="somename.pdf">
					download
				</PDFDownloadLink>
			</div>

			{}
		</MainLayout>
	);
}

export default ReactPDF.render(<PDFProjectExportDocument />, '');
