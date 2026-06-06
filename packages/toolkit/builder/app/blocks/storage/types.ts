/**
 * Enum representing different builder platforms supported by the system
 */
export enum BuilderPlatform {
	Unknown = 'Unknown',
	BuilderIO = 'Builder.io',
	CraftJS = 'Craft.js',
	Plasmic = 'Plasmic',
	GrapesJS = 'GrapesJS'
}

/**
 * Interface representing the configuration object for a block
 * This is a generic type that can be extended based on platform-specific needs
 */
export interface BuilderIoConfig {
	builderIoPageUrl: string;
	builderApiKey?: string;
}

export interface PlasmicConfig {
	plasmicApiKey?: string;
	plasmicProjectId?: string;
}

export interface GrapesJSConfig {
	components?: string;
}

export interface CraftJSConfig {
	// Add any CraftJS specific configuration properties here
	// For now, it's an empty interface since no specific config is needed
}

export type BlockConfig = BuilderIoConfig | PlasmicConfig | GrapesJSConfig | CraftJSConfig;

export function isBuilderIoConfig(config: BlockConfig): config is BuilderIoConfig {
	return 'builderIoPageUrl' in config && typeof config.builderIoPageUrl === 'string';
}

export function isPlasmicConfig(config: BlockConfig): config is PlasmicConfig {
	return (
		('plasmicApiKey' in config &&
			(config.plasmicApiKey === undefined || typeof config.plasmicApiKey === 'string')) ||
		('plasmicProjectId' in config &&
			(config.plasmicProjectId === undefined || typeof config.plasmicProjectId === 'string'))
	);
}

export function isGrapesJSConfig(config: BlockConfig): config is GrapesJSConfig {
	return 'components' in config && (config.components === undefined || typeof config.components === 'string');
}

export function isCraftJSConfig(config: BlockConfig): config is CraftJSConfig {
	// Since CraftJSConfig is currently empty, we can check if it's not any of the other configs
	// or define specific properties when they're added
	return !isBuilderIoConfig(config) && !isPlasmicConfig(config) && !isGrapesJSConfig(config);
}

/**
 * Interface representing a Block in the system
 */
export interface Block {
	id: string;
	title: string;
	builderPlatform: BuilderPlatform;
	createdAt: Date;
	updatedAt: Date;
	config: BlockConfig;
}

/**
 * Storage error codes for more precise error handling
 */
export type StorageErrorCode =
	| 'NO_BLOCKS'
	| 'NOT_FOUND'
	| 'STORAGE_UNAVAILABLE'
	| 'INVALID_DATA'
	| 'VALIDATION_ERROR'
	| 'QUOTA_EXCEEDED'
	| 'UNKNOWN_ERROR';

/**
 * Interface for the response structure of storage operations
 */
export interface StorageResponse<T> {
	/** The data returned by the operation */
	data: T | null;
	/** Error message if the operation failed */
	error?: string;
	/** Structured error code for programmatic handling */
	errorCode?: StorageErrorCode;
}

/**
 * Interface for the parameters required for storage operations
 */
export interface StorageParams {
	/** Tenant identifier */
	tenantId: string;
	/** Organization identifier */
	orgId: string;
}
