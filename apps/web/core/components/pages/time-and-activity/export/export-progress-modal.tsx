'use client';

import React from 'react';
import { Modal } from '@/core/components';
import { Button } from '@/core/components/duplicated-components/_button';
import { XCircle, Download } from 'lucide-react';
import { CheckCircle2, Spinner } from '@/core/components/icons';
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
		if (exportProgress.error) return 'bg-destructive';
		if (exportProgress.success) return 'bg-success';
		return 'bg-primary';
	};

	const getProgressIcon = () => {
		if (exportProgress.error) {
			return <XCircle className="size-5 text-destructive-ink" />;
		}
		if (exportProgress.success) {
			return <CheckCircle2 className="size-5 text-success-foreground" />;
		}
		if (exportProgress.isExporting) {
			return <Spinner className="size-5 text-muted-foreground animate-spin" />;
		}
		return <Download className="size-5 text-muted-foreground" />;
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
			<div>
				{/* Header */}
				<div className="flex gap-3 items-center mb-4">
					{getProgressIcon()}
					<div>
						<h3 className="text-lg font-semibold text-foreground">{getTitle()}</h3>
						<p className="text-sm text-muted-foreground">{getDescription()}</p>
					</div>
				</div>

				{/* Progress Bar */}
				{(exportProgress.isExporting || exportProgress.success) && (
					<div className="mb-4">
						<div className="flex justify-between mb-2 text-xs tabular-nums text-muted-foreground">
							<span>Progress</span>
							<span>{exportProgress.progress}%</span>
						</div>
						<div className="w-full h-1.5 rounded-full bg-foreground/10">
							<div
								className={`h-1.5 rounded-full transition-[width] duration-300 ${getProgressColor()}`}
								style={{ width: `${exportProgress.progress}%` }}
							/>
						</div>
					</div>
				)}

				{/* Current Step */}
				{exportProgress.isExporting && (
					<div className="p-3 mb-4 rounded-lg bg-info/10">
						<p className="text-sm text-info-foreground">{exportProgress.currentStep}</p>
					</div>
				)}

				{/* Error Details */}
				{exportProgress.error && (
					<div className="p-3 mb-4 rounded-lg bg-destructive/10">
						<p className="text-sm text-destructive-ink">{exportProgress.error}</p>
					</div>
				)}

				{/* Success Message */}
				{exportProgress.success && (
					<div className="p-3 mb-4 rounded-lg bg-success/10">
						<p className="text-sm text-success-foreground">
							Export {exportType.toUpperCase()} completed successfully
						</p>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-2 justify-end">
					{exportProgress.error && onRetry && (
						<Button variant="outline" onClick={onRetry}>
							<Download />
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
					<div className="p-3 mt-4 rounded-lg bg-foreground/3">
						<h4 className="mb-2 text-sm font-medium text-foreground">Export Tips</h4>
						<ul className="space-y-1 text-xs text-muted-foreground">
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
