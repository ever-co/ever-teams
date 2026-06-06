'use client';

import React from 'react';

import {
	TeamsBasicTimer,
	TeamsEssentialTimer,
	TeamsModernTimer,
	TeamsBasicReport,
	fakedataTable,
	TeamsProgressCircle,
	TeamsTable,
	TeamsFontToggle,
	ToggleThemeContainer
} from '@ever-teams/atoms';
import { Toaster } from '@ever-teams/toolkit-ui';

export default function Page(): React.JSX.Element {
	return (
		<main className="dark:bg-gray-900">
			<div className="flex flex-wrap gap-8 items-start p-24 pt-32 bg-gray-50 dark:bg-gray-900">
				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Basics</h1>
					<TeamsBasicTimer />
					<TeamsBasicTimer border="thick" readonly />
					<TeamsBasicTimer border="thick" readonly rounded="small" />
					<TeamsBasicTimer border="thick" readonly rounded="large" />
					<TeamsBasicTimer background="secondary" readonly />
					<TeamsBasicTimer background="secondary" readonly rounded="small" />
					<TeamsBasicTimer background="secondary" readonly rounded="large" />
					<TeamsBasicTimer background="primary" color="destructive" readonly />
					<TeamsBasicTimer background="primary" color="destructive" readonly rounded="small" />
					<TeamsBasicTimer background="primary" color="destructive" readonly rounded="large" />
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Icons</h1>

					<TeamsBasicTimer icon readonly />
					<TeamsBasicTimer border="thick" icon readonly />
					<TeamsBasicTimer border="thick" icon readonly rounded="small" />
					<TeamsBasicTimer border="thick" icon readonly rounded="large" />
					<TeamsBasicTimer background="secondary" icon readonly />
					<TeamsBasicTimer background="secondary" icon readonly rounded="small" />
					<TeamsBasicTimer background="secondary" icon readonly rounded="large" />
					<TeamsBasicTimer background="primary" color="destructive" icon readonly />
					<TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="small" />
					<TeamsBasicTimer background="primary" color="destructive" icon readonly rounded="large" />
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Progress</h1>
					<TeamsBasicTimer icon progress readonly />
					<TeamsBasicTimer border="thick" icon progress readonly />
					<TeamsBasicTimer border="thick" icon progress readonly rounded="small" />
					<TeamsBasicTimer border="thick" icon progress readonly rounded="large" />
					<TeamsBasicTimer background="secondary" icon progress readonly />
					<TeamsBasicTimer background="secondary" icon progress readonly rounded="small" />
					<TeamsBasicTimer background="secondary" icon progress readonly rounded="large" />
					<TeamsBasicTimer background="primary" color="destructive" icon progress readonly />
					<TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="small" />
					<TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="large" />
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Button</h1>
					<TeamsBasicTimer icon progress />
					<TeamsBasicTimer border="thick" icon progress />
					<TeamsBasicTimer border="thick" icon progress rounded="small" />
					<TeamsBasicTimer border="thick" icon progress rounded="large" />
					<TeamsBasicTimer background="secondary" icon progress />
					<TeamsBasicTimer background="secondary" icon progress rounded="small" />
					<TeamsBasicTimer background="secondary" icon progress rounded="large" />
					<TeamsBasicTimer background="primary" color="destructive" icon progress />
					<TeamsBasicTimer background="primary" color="destructive" icon progress rounded="small" />
					<TeamsBasicTimer background="primary" color="destructive" icon progress rounded="large" />
				</div>
			</div>
			<hr />
			<div className="flex flex-wrap gap-8 items-start p-24 bg-gray-50 dark:bg-gray-900">
				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Basics</h1>
					<TeamsEssentialTimer />
					<TeamsEssentialTimer border="thick" readonly />
					<TeamsEssentialTimer border="thick" readonly rounded="small" />
					<TeamsEssentialTimer border="thick" readonly rounded="large" />
					<TeamsEssentialTimer background="secondary" readonly />
					<TeamsEssentialTimer background="secondary" readonly rounded="small" />
					<TeamsEssentialTimer background="secondary" readonly rounded="large" />
					<TeamsEssentialTimer background="primary" color="destructive" readonly />
					<TeamsEssentialTimer background="primary" color="destructive" readonly rounded="small" />
					<TeamsEssentialTimer background="primary" color="destructive" readonly rounded="large" />
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Icons</h1>
					<TeamsEssentialTimer icon readonly />
					<TeamsEssentialTimer border="thick" icon readonly />
					<TeamsEssentialTimer border="thick" icon readonly rounded="small" />
					<TeamsEssentialTimer border="thick" icon readonly rounded="large" />
					<TeamsEssentialTimer background="secondary" icon readonly />
					<TeamsEssentialTimer background="secondary" icon readonly rounded="small" />
					<TeamsEssentialTimer background="secondary" icon readonly rounded="large" />
					<TeamsEssentialTimer background="primary" color="destructive" icon readonly />
					<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="small" />
					<TeamsEssentialTimer background="primary" color="destructive" icon readonly rounded="large" />
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Progress</h1>
					<TeamsEssentialTimer icon progress readonly />
					<TeamsEssentialTimer border="thick" icon progress readonly />
					<TeamsEssentialTimer border="thick" icon progress readonly rounded="small" />
					<TeamsEssentialTimer border="thick" icon progress readonly rounded="large" />
					<TeamsEssentialTimer background="secondary" icon progress readonly />
					<TeamsEssentialTimer background="secondary" icon progress readonly rounded="small" />
					<TeamsEssentialTimer background="secondary" icon progress readonly rounded="large" />
					<TeamsEssentialTimer background="primary" color="destructive" icon progress readonly />
					<TeamsEssentialTimer
						background="primary"
						color="destructive"
						icon
						progress
						readonly
						rounded="small"
					/>
					<TeamsEssentialTimer
						background="primary"
						color="destructive"
						icon
						progress
						readonly
						rounded="large"
					/>
				</div>

				<div className="flex flex-col gap-4 items-start">
					<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">With Button</h1>
					<TeamsEssentialTimer icon labeled progress />
					<TeamsEssentialTimer border="thick" icon labeled progress />
					<TeamsEssentialTimer border="thick" icon labeled progress rounded="small" />
					<TeamsEssentialTimer border="thick" icon labeled progress rounded="large" />
					<TeamsEssentialTimer background="secondary" icon labeled progress />
					<TeamsEssentialTimer background="secondary" icon labeled progress rounded="small" />
					<TeamsEssentialTimer background="secondary" icon labeled progress rounded="large" />
					<TeamsEssentialTimer background="primary" color="destructive" icon labeled progress />
					<TeamsEssentialTimer
						background="primary"
						color="destructive"
						icon
						labeled
						progress
						rounded="small"
					/>
					<TeamsEssentialTimer
						background="primary"
						color="destructive"
						icon
						labeled
						progress
						rounded="large"
					/>
					<TeamsFontToggle />
				</div>
			</div>
			<hr />

			<div className="flex flex-col gap-8 items-start p-10 bg-gray-50 dark:bg-gray-900">
				<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Modern Timer</h1>

				<div className="flex flex-wrap gap-4 items-start">
					<TeamsModernTimer expandable={true} showProgress variant={'default'} size={'sm'} />
					<TeamsModernTimer expandable={true} showProgress={false} variant={'default'} size={'sm'} />
					<TeamsModernTimer expandable={true} showProgress variant={'bordered'} size={'sm'} />
					<TeamsModernTimer expandable={true} showProgress variant={'default'} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'default'} expandable={true} />
					<TeamsModernTimer showProgress variant={'default'} expandable={true} />
				</div>
			</div>
			{/* <hr /> */}
			<div className="flex flex-col gap-8 items-start p-10 min-h-screen bg-gray-50 dark:bg-gray-900">
				<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Modern Timer</h1>
				<div className="flex flex-wrap gap-4 items-start">
					<TeamsModernTimer expandable={true} showProgress variant={'default'} />
					<TeamsModernTimer showProgress variant={'default'} size={'default'} expandable={true} />
					<TeamsModernTimer showProgress variant={'default'} expandable={true} />
					<TeamsModernTimer expandable={true} showProgress variant={'bordered'} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'default'} expandable={true} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'sm'} expandable={true} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'sm'} expandable={true} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'sm'} expandable={true} />
					<TeamsModernTimer showProgress variant={'bordered'} size={'lg'} expandable={true} />
				</div>
			</div>
			<hr />
			<div className="flex flex-col gap-8 items-start p-10 min-h-screen bg-gray-50 dark:bg-gray-900">
				<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Teams Report</h1>

				<div className="flex flex-wrap gap-4 items-start">
					<TeamsBasicReport type="bar-horizontal" />
					<TeamsBasicReport type="bar-horizontal" variant={'bordered'} />
					<TeamsBasicReport type="bar" />
					<TeamsBasicReport type="line" />
					<TeamsBasicReport type="area" />
					<TeamsBasicReport type="tooltip" />
					<TeamsBasicReport type="radial" />
					<TeamsBasicReport type="radar" />
					<TeamsBasicReport type="pie" />
				</div>
			</div>

			<div className="flex flex-col gap-8 items-start p-10 bg-gray-50 dark:bg-gray-900">
				<h1 className="font-semibold text-gray-700 text-md dark:text-gray-100">Progress Circle</h1>
				<ToggleThemeContainer />
				<div className="flex gap-4 justify-between w-full h-80 rounded-lg border-4 border-dashed border-secondaryColor">
					<TeamsProgressCircle />
					<TeamsProgressCircle />
					<TeamsProgressCircle />
					<TeamsProgressCircle />
				</div>
			</div>

			<div className="flex flex-col gap-8 items-start p-10 dark:bg-gray-900">
				<h1 className="font-semibold text-gray-700 rounded text-md dark:text-gray-100">Table</h1>
				<ToggleThemeContainer />
				<div className="flex gap-4 items-stretch w-full">
					<TeamsTable
						data={fakedataTable}
						caption="A list of your recent invoices."
						footerData={{ label: 'Total', value: '$2,500.00' }}
						renderHeader={(column) => column.toUpperCase()}
						renderCell={(row, column) => (
							<span
								className={`${row[column] !== 'Paid' ? 'dark:text-white' : ''}`}
								style={{
									color: column === 'paymentStatus' && row[column] === 'Paid' ? 'green' : 'black'
								}}
							>
								{row[column]}
							</span>
						)}
						tableClassName="border-collapse w-full dark:text-white"
						headerClassName="bg-gray-200 dark:text-white"
						rowClassName="hover:bg-gray-100 dark:text-white"
						cellClassName="p-4 border dark:text-white"
						footerClassName="font-bold"
					/>
				</div>
			</div>
			<Toaster />
		</main>
	);
}
