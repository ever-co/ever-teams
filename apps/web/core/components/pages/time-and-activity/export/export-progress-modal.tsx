'use client';

import React from 'react';
import { Modal } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { CheckCircle2, XCircle, Download, Loader2 } from 'lucide-react';
import { ExportProgress } from '@/core/hooks/activities/use-export-progress';

export interface ExportProgressModalProps {
	isOpen: boolean;
	onClose: () => void;
	exportProgress: ExportProgress;
	exportType: 'csv' | 'xlsx' | 'pdf';
	onRetry?: () => void;
}

export function ExportProgressModal({
	isOpen,
	onClose,
	exportProgress,
	exportType,
	onRetry
}: ExportProgressModalProps) {
	const getProgressColor = () => {
		if (exportProgress.error) return 'bg-red-500';
		if (exportProgress.success) return 'bg-green-500';
		return 'bg-blue-500';
	};

	const getProgressIcon = () => {
		if (exportProgress.error) {
			return <XCircle className="w-6 h-6 text-red-500" />;
		}
		if (exportProgress.success) {
			return <CheckCircle2 className="w-6 h-6 text-green-500" />;
		}
		if (exportProgress.isExporting) {
			return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
		}
		return <Download className="w-6 h-6 text-gray-500" />;
	};

	const getTitle = () => {
		if (exportProgress.error) {
			return 'Export Failed';
		}
		if (exportProgress.success) {
			return 'Export Completed';
		}
		if (exportProgress.isExporting) {
			return 'Exporting Data';
		}
		return 'Preparing Export';
	};

	const getDescription = () => {
		if (exportProgress.error) {
			return exportProgress.error;
		}
		if (exportProgress.success) {
			return `Download ${exportType.toUpperCase()} ready`;
		}
		return exportProgress.currentStep;
	};

	return (
		<Modal isOpen={isOpen} closeModal={onClose} className="max-w-md">
			<div className="p-6">
				{/* Header */}
				<div className="flex gap-3 items-center mb-4">
					{getProgressIcon()}
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getTitle()}</h3>
						<p className="text-sm text-gray-600 dark:text-gray-400">{getDescription()}</p>
					</div>
				</div>

				{/* Progress Bar */}
				{(exportProgress.isExporting || exportProgress.success) && (
					<div className="mb-4">
						<div className="flex justify-between mb-2 text-sm text-gray-600 dark:text-gray-400">
							<span>Progress</span>
							<span>{exportProgress.progress}%</span>
						</div>
						<div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
							<div
								className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
								style={{ width: `${exportProgress.progress}%` }}
							/>
						</div>
					</div>
				)}

				{/* Current Step */}
				{exportProgress.isExporting && (
					<div className="p-3 mb-4 bg-blue-50 rounded-lg dark:bg-blue-900/20">
						<p className="text-sm text-blue-700 dark:text-blue-300">{exportProgress.currentStep}</p>
					</div>
				)}

				{/* Error Details */}
				{exportProgress.error && (
					<div className="p-3 mb-4 bg-red-50 rounded-lg dark:bg-red-900/20">
						<p className="text-sm text-red-700 dark:text-red-300">{exportProgress.error}</p>
					</div>
				)}

				{/* Success Message */}
				{exportProgress.success && (
					<div className="p-3 mb-4 bg-green-50 rounded-lg dark:bg-green-900/20">
						<p className="text-sm text-green-700 dark:text-green-300">
							Export {exportType.toUpperCase()} completed successfully
						</p>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-3 justify-end">
					{exportProgress.error && onRetry && (
						<Button variant="outline" onClick={onRetry} className="flex gap-2 items-center">
							<Download className="w-4 h-4" />
							Retry
						</Button>
					)}

					{!exportProgress.isExporting && (
						<Button variant={exportProgress.success ? 'default' : 'outline'} onClick={onClose}>
							{exportProgress.success ? 'Done' : 'Close'}
						</Button>
					)}
				</div>

				{/* Export Tips */}
				{exportProgress.isExporting && (
					<div className="p-3 mt-4 bg-gray-50 rounded-lg dark:bg-gray-800">
						<h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">Export Tips</h4>
						<ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
							<li>• Don't close the browser</li>
							<li>• Large datasets may take longer to export</li>
							<li>• Use the browser's download feature</li>
						</ul>
					</div>
				)}
			</div>
		</Modal>
	);
}
