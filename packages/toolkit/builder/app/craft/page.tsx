'use client';
import { useEditor } from '@craftjs/core';
import React, { useEffect, useState, Suspense } from 'react';
import { VisualBuilderHeader } from '../../components/layouts/visual-builder-header';
import { SettingsPanel, AtomsPanel, disableAtom } from './components';
import CopyCode from './components/copy-code';
import { Button } from '@/components/ui/button';
import { RotateCw, RotateCcw, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import PreviewButton from './components/preview-button';
import DragZoneFrame from './components/drag-zone-frame';
import { useDeleteAtom } from './hooks/use-delete-atom';
import { useAtom } from 'jotai';
import { motion } from 'framer-motion';
import { ToggleThemeContainer } from '@ever-teams/atoms';
import { withAuth } from '../../components/auth/with-auth';
import { cn } from '@/lib/utils';
import { useExport } from './hooks/use-export';
import { useAutosave } from './hooks/use-autosave';
import { RowLayout as RowComponent, ColumnLayout as Column } from './components/drag-components/layout/row-layout/index';
import { useRouter, useSearchParams } from 'next/navigation';
import { BlockStorageService, BuilderPlatform, Block } from '../blocks/storage/block-storage-service';
import { TENANT } from '../constants';

function App() {
	const { enabled, actions, canUndo, canRedo } = useEditor((state, query) => ({
		enabled: state.options.enabled,
		canUndo: query.history.canUndo(),
		canRedo: query.history.canRedo()
	}));

	const [disable] = useAtom(disableAtom);
	const { handleExportNextJS } = useExport();
	const searchParams = useSearchParams();
	const id = searchParams.get('id');
	const tenantId = TENANT.ID;
	const orgId = TENANT.ORG_ID;
	const storageService = React.useMemo(() => new BlockStorageService(), []);
	const [block, setBlock] = useState<Block | null>(null);
	const [title, setTitle] = useState('Craft.js Visual Editor');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!id) return;

		async function loadBlock() {
			try {
				setIsLoading(true);
				const { data: found, error: fetchError, errorCode } = await storageService.getBlockById(
					{ tenantId, orgId },
					id!
				);
				if (fetchError || errorCode) {
					throw new Error(fetchError || `Error code: ${errorCode}`);
				}
				if (found) {
					if (found.builderPlatform !== BuilderPlatform.CraftJS) {
						throw new Error('Block found but not a CraftJS platform block');
					}
					setBlock(found);
					setTitle(found.title);
				} else {
					throw new Error('Block not found');
				}
			} catch (error) {
				console.error('Failed to load block:', error);
				setError(error instanceof Error ? error : new Error('Failed to load block'));
			} finally {
				setIsLoading(false);
			}
		}

		loadBlock();
	}, [id, storageService, tenantId, orgId]);

	const handleTitleChange = async (newTitle: string) => {
		setTitle(newTitle);
		if (!block) return;
		const { data: updated } = await storageService.updateBlock(
			{ tenantId, orgId },
			block.id,
			{ title: newTitle }
		);
		setBlock(updated);
	};

	useAutosave({
		projectId: id || 'craft-builder',
		debounceTime: 1000,
		onSave: async (components: any) => {
			if (!block) return;
			try {
				const { error } = await storageService.updateBlock(
					{ tenantId, orgId },
					block.id,
					{ config: { ...block.config, components } }
				);
				if (error) {
					throw new Error(error);
				}
			} catch (error) {
				console.error('Failed to autosave block:', error);
			}
		}
	});

	useDeleteAtom();

	return (
		<>
			<VisualBuilderHeader
				title={title}
				onTitleChange={handleTitleChange}
				platform="Craft.js"
			/>
			<div className="flex justify-between">
				<Sidebar enabled={enabled}>
					<AtomsPanel />
				</Sidebar>
				<MainContent>
					<DragZoneFrame />
				</MainContent>
				<SettingsPanel />
			</div>
		</>
	);
}

function Sidebar({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
	return (
		<motion.div
			className="border-r dark:border-r-transparent shadow-lg relative"
			animate={enabled ? { width: '350px', display: 'block' } : { width: 0, display: 'none' }}
		>
			<ScrollArea className="h-[calc(100vh-_80px)]">
				<div id="side-bar" className="w-[350px] px-2.5">
					<div className="flex flex-col space-y-1 py-4 px-2">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
							Components
						</h2>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Drag and drop to build your interface
						</p>
					</div>
					{children}
				</div>
			</ScrollArea>
		</motion.div>
	);
}

function MainContent({ children }: { children: React.ReactNode }) {
	return (
		<ScrollArea className="h-[calc(100vh-_80px)] bg-[#F8F8FF] dark:bg-[#1E2025] w-full flex justify-center items-center">
			<div id="canvas" className="flex-grow ">
				{children}
			</div>
		</ScrollArea>
	);
}

export default function CraftPage() {
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<App />
		</Suspense>
	);
}
