import { Button } from '@/core/components';
import { Menu, Transition } from '@headlessui/react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PDFDocument } from '@/core/components/pages/projects/export-formats/pdf';
import { ProjectViewDataType } from './project-views';
import moment from 'moment';
import { TOrganizationTeam } from '@/core/types/schemas';

interface IProps {
	projects: ProjectViewDataType[];
	activeTeam: TOrganizationTeam | null;
}

export function ProjectExportMenu(props: IProps) {
	const { projects, activeTeam } = props;

	const t = useTranslations();

	return (
		<Menu as="div" className="relative inline-block text-left">
			<Menu.Button className="items-center justify-between w-full h-full ">
				<Button
					type="button"
					className=" border-gray-200 text-sm hover:bg-slate-100 min-w-fit text-black  h-[2.2rem] font-light hover:dark:bg-transparent"
					variant="outline"
				>
					<span>{t('common.EXPORT')}</span> <ChevronDown size={15} />
				</Button>
			</Menu.Button>
			<Transition
				as="div"
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items
					static
					className="absolute z-[999] left-1/2 -translate-x-1/2 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none"
				>
					<div className="flex flex-col gap-1 p-1">
						<Menu.Item>
							{({ active }) => (
								<button
									className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
								>
									<PDFDownloadLink
										className="w-full h-full text-left"
										document={
											<PDFDocument
												data={projects.map((el) => {
													return {
														projectName: el.project.name || '-',
														status: el.status || '-',
														archivedAt: el.archivedAt
															? moment(el.archivedAt).format('YYYY-MM-DD')
															: '-',
														startDate: el.startDate
															? moment(el.startDate).format('YYYY-MM-DD')
															: '-',
														endDate: el.endDate
															? moment(el.endDate).format('YYYY-MM-DD')
															: '-',
														members:
															el.members?.map((el) => el.employee?.fullName || '') ?? [],
														managers:
															el.managers?.map((el) => el.employee?.fullName || '') ?? [],
														teams: el.teams?.map((el) => el.name) ?? []
													};
												})}
												headers={{
													projectName: t('pages.projects.projectTitle.SINGULAR'),
													status: t('common.STATUS'),
													archivedAt: t('common.ARCHIVE_AT'),
													startDate: t('common.START_DATE'),
													endDate: t('common.END_DATE'),
													members: t('common.MEMBERS'),
													managers: t('common.MANAGERS'),
													teams: t('common.TEAMS')
												}}
												title={`${activeTeam?.name} Organization Projects`}
											/>
										}
										fileName={`${activeTeam?.name}-organization-projects.pdf`}
									>
										{({ loading }) =>
											loading ? (
												<p className="w-full h-full">{t('common.LOADING')}...</p>
											) : (
												<p className="w-full h-full">PDF</p>
											)
										}
									</PDFDownloadLink>
								</button>
							)}
						</Menu.Item>
						<Menu.Item>
							{({ active }) => (
								<button
									disabled // Will be implemented later
									className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
								>
									<span>CSV</span>
								</button>
							)}
						</Menu.Item>
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
