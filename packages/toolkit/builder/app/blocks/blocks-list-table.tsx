'use client';

import { Block } from './storage';
import { BlockActions } from './actions/block-actions';
import { Table, TableBody, TableCell, TableRow } from '@ever-teams/toolkit-ui';

interface BlocksListTableProps {
	blocks: Block[];
	onDelete: (blockId: string) => Promise<void>;
	header: React.ReactNode;
}

export function BlocksListTable({ blocks, onDelete, header }: BlocksListTableProps) {
	if (blocks.length === 0) {
		return null;
	}

	return (
		<div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
			<Table className="min-w-[800px]">
				{header}
				<TableBody>
					{blocks.map((block, idx) => (
						<TableRow
							key={block.id}
							className={
								`transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50'} ` +
								'hover:bg-blue-50/50 dark:hover:bg-slate-800/70 focus-within:bg-blue-50/50 dark:focus-within:bg-slate-800/70'
							}
						>
							<TableCell className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap px-6 py-4 align-middle">
								{block.title}
							</TableCell>
							<TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap px-6 py-4 align-middle">
								{block.builderPlatform}
							</TableCell>
							<TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap px-6 py-4 align-middle">
								{block.createdAt.toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: '2-digit'
								})}
							</TableCell>
							<TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap px-6 py-4 align-middle">
								{block.updatedAt.toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'short',
									day: '2-digit'
								})}
							</TableCell>
							<TableCell className="text-right px-6 py-4 align-middle">
								<BlockActions block={block} onDelete={onDelete} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
