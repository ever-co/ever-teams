/**
 * Configuration for export functionality
 * Optimizes performance and handles large datasets
 */

export interface ExportConfig {
	// Performance settings
	maxRecordsPerBatch: number;
	batchProcessingDelay: number;
	maxConcurrentExports: number;
	
	// Memory management
	maxMemoryUsageMB: number;
	enableStreaming: boolean;
	
	// File size limits
	maxFileSizeMB: number;
	compressionEnabled: boolean;
	
	// Progress tracking
	progressUpdateInterval: number;
	enableProgressTracking: boolean;
	
	// Error handling
	maxRetryAttempts: number;
	retryDelay: number;
	
	// Format-specific settings
	csv: {
		delimiter: string;
		encoding: string;
		includeHeaders: boolean;
		escapeQuotes: boolean;
	};
	
	xlsx: {
		compression: boolean;
		sheetName: string;
		maxRowsPerSheet: number;
		includeCharts: boolean;
	};
	
	pdf: {
		pageSize: 'A4' | 'Letter' | 'Legal';
		orientation: 'portrait' | 'landscape';
		maxRowsPerPage: number;
		includeImages: boolean;
	};
}

// Default configuration optimized for performance
export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
	// Performance settings
	maxRecordsPerBatch: 1000,
	batchProcessingDelay: 10, // ms
	maxConcurrentExports: 3,
	
	// Memory management
	maxMemoryUsageMB: 100,
	enableStreaming: true,
	
	// File size limits
	maxFileSizeMB: 50,
	compressionEnabled: true,
	
	// Progress tracking
	progressUpdateInterval: 100, // ms
	enableProgressTracking: true,
	
	// Error handling
	maxRetryAttempts: 3,
	retryDelay: 1000, // ms
	
	// Format-specific settings
	csv: {
		delimiter: ',',
		encoding: 'utf-8',
		includeHeaders: true,
		escapeQuotes: true
	},
	
	xlsx: {
		compression: true,
		sheetName: 'Time & Activity',
		maxRowsPerSheet: 100000,
		includeCharts: false
	},
	
	pdf: {
		pageSize: 'A4',
		orientation: 'landscape',
		maxRowsPerPage: 50,
		includeImages: false
	}
};

// Configuration for different dataset sizes
export const EXPORT_CONFIGS = {
	small: {
		...DEFAULT_EXPORT_CONFIG,
		maxRecordsPerBatch: 500,
		enableStreaming: false,
		progressUpdateInterval: 50
	},
	
	medium: {
		...DEFAULT_EXPORT_CONFIG,
		maxRecordsPerBatch: 1000,
		enableStreaming: true,
		progressUpdateInterval: 100
	},
	
	large: {
		...DEFAULT_EXPORT_CONFIG,
		maxRecordsPerBatch: 2000,
		enableStreaming: true,
		progressUpdateInterval: 200,
		batchProcessingDelay: 20
	},
	
	enterprise: {
		...DEFAULT_EXPORT_CONFIG,
		maxRecordsPerBatch: 5000,
		enableStreaming: true,
		progressUpdateInterval: 500,
		batchProcessingDelay: 50,
		maxMemoryUsageMB: 200
	}
};

/**
 * Get optimal configuration based on dataset size
 */
export function getOptimalExportConfig(recordCount: number): ExportConfig {
	if (recordCount <= 100) {
		return EXPORT_CONFIGS.small;
	} else if (recordCount <= 1000) {
		return EXPORT_CONFIGS.medium;
	} else if (recordCount <= 10000) {
		return EXPORT_CONFIGS.large;
	} else {
		return EXPORT_CONFIGS.enterprise;
	}
}

/**
 * Estimate memory usage for export
 */
export function estimateMemoryUsage(recordCount: number, avgRecordSizeKB: number = 1): number {
	return (recordCount * avgRecordSizeKB) / 1024; // MB
}

/**
 * Check if export is feasible with current configuration
 */
export function validateExportFeasibility(
	recordCount: number,
	config: ExportConfig = DEFAULT_EXPORT_CONFIG
): { feasible: boolean; reason?: string; suggestedConfig?: ExportConfig } {
	const estimatedMemory = estimateMemoryUsage(recordCount);
	
	if (estimatedMemory > config.maxMemoryUsageMB) {
		const suggestedConfig = getOptimalExportConfig(recordCount);
		return {
			feasible: false,
			reason: `Estimated memory usage (${estimatedMemory.toFixed(1)}MB) exceeds limit (${config.maxMemoryUsageMB}MB)`,
			suggestedConfig
		};
	}
	
	const estimatedFileSizeMB = estimatedMemory * 0.8; // Rough estimate
	if (estimatedFileSizeMB > config.maxFileSizeMB) {
		return {
			feasible: false,
			reason: `Estimated file size (${estimatedFileSizeMB.toFixed(1)}MB) exceeds limit (${config.maxFileSizeMB}MB)`
		};
	}
	
	return { feasible: true };
}

/**
 * Performance monitoring utilities
 */
export class ExportPerformanceMonitor {
	private startTime: number = 0;
	private checkpoints: { [key: string]: number } = {};
	
	start(): void {
		this.startTime = performance.now();
		this.checkpoints = {};
	}
	
	checkpoint(name: string): void {
		this.checkpoints[name] = performance.now() - this.startTime;
	}
	
	getMetrics(): { totalTime: number; checkpoints: { [key: string]: number } } {
		return {
			totalTime: performance.now() - this.startTime,
			checkpoints: { ...this.checkpoints }
		};
	}
	
	logMetrics(): void {
		const metrics = this.getMetrics();
		console.log('Export Performance Metrics:', {
			totalTime: `${metrics.totalTime.toFixed(2)}ms`,
			checkpoints: Object.entries(metrics.checkpoints).map(([name, time]) => ({
				name,
				time: `${time.toFixed(2)}ms`
			}))
		});
	}
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): { used: number; total: number } | null {
	if (typeof window !== 'undefined' && 'memory' in performance) {
		const memory = (performance as any).memory;
		return {
			used: memory.usedJSHeapSize / 1024 / 1024, // MB
			total: memory.totalJSHeapSize / 1024 / 1024 // MB
		};
	}
	return null;
}

/**
 * Batch processing utility for large datasets
 */
export async function processBatches<T, R>(
	items: T[],
	batchSize: number,
	processor: (batch: T[]) => Promise<R[]>,
	onProgress?: (processed: number, total: number) => void,
	delay: number = 0
): Promise<R[]> {
	const results: R[] = [];
	const total = items.length;
	
	for (let i = 0; i < total; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const batchResults = await processor(batch);
		results.push(...batchResults);
		
		onProgress?.(Math.min(i + batchSize, total), total);
		
		// Add delay to prevent blocking the main thread
		if (delay > 0 && i + batchSize < total) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}
	
	return results;
}
