import { useState, useCallback } from 'react';

export interface ExportProgress {
	isExporting: boolean;
	progress: number;
	currentStep: string;
	error: string | null;
	success: boolean;
}

export interface ExportProgressHook {
	exportProgress: ExportProgress;
	startExport: (totalSteps: number) => void;
	updateProgress: (step: number, stepName: string) => void;
	setError: (error: string) => void;
	setSuccess: () => void;
	resetProgress: () => void;
}

export function useExportProgress(): ExportProgressHook {
	const [exportProgress, setExportProgress] = useState<ExportProgress>({
		isExporting: false,
		progress: 0,
		currentStep: '',
		error: null,
		success: false
	});

	const startExport = useCallback((totalSteps: number) => {
		setExportProgress({
			isExporting: true,
			progress: 0,
			currentStep: 'Preparing data...',
			error: null,
			success: false
		});
	}, []);

	const updateProgress = useCallback((step: number, stepName: string) => {
		setExportProgress((prev) => ({
			...prev,
			progress: step,
			currentStep: stepName
		}));
	}, []);

	const setError = useCallback((error: string) => {
		setExportProgress((prev) => ({
			...prev,
			isExporting: false,
			error,
			success: false
		}));
	}, []);

	const setSuccess = useCallback(() => {
		setExportProgress((prev) => ({
			...prev,
			isExporting: false,
			progress: 100,
			currentStep: 'Completed',
			error: null,
			success: true
		}));
	}, []);

	const resetProgress = useCallback(() => {
		setExportProgress({
			isExporting: false,
			progress: 0,
			currentStep: '',
			error: null,
			success: false
		});
	}, []);

	return {
		exportProgress,
		startExport,
		updateProgress,
		setError,
		setSuccess,
		resetProgress
	};
}
