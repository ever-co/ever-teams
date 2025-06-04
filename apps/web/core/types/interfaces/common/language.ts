import { UseQueryResult } from '@tanstack/react-query';
import { PaginationResponse } from './data-response';
import { IBasePerTenantAndOrganizationEntityModel } from './base-interfaces';
import { TLanguageItemList } from '../../schemas/common/language.schema';

export interface ILanguage extends IBasePerTenantAndOrganizationEntityModel {
	name?: string;
	code?: string;
	is_system?: boolean;
	description?: string;
	color?: string;
	isSelected?: boolean;
}
//export language list interface

export interface ILanguageItemList {
	id: string;
	createdAt: string;
	updatedAt: string;
	code: string;
	name: string;
	is_system?: boolean;
	description: string;
	color: string;
	items: [];
	data: any;
}

/**
 * Language settings hook return type
 * @interface UseLanguageSettingsReturn
 */
export interface UseLanguageSettingsReturn {
	/** Function to load languages data from the API */
	loadLanguagesData: () => Promise<{ data: PaginationResponse<TLanguageItemList> | { items: []; total: 0 } }>;
	/** Loading state for the languages query */
	loading: boolean;
	/** Array of available languages filtered by APPLICATION_LANGUAGES_CODE */
	languages: ILanguageItemList[];
	/** Legacy loading state for backward compatibility */
	languagesFetching: boolean;
	/** Currently active language object */
	activeLanguage: ILanguageItemList | null;
	/** Function to set the active language */
	setActiveLanguage: (languageId: ILanguageItemList) => void;
	/** First load data function for backward compatibility */
	firstLoadLanguagesData: () => void;
	/** Error object from React Query if the request failed */
	error: Error | null;
	/** Boolean indicating if there's an error */
	isError: boolean;
	/** Function to manually refetch languages data */
	refetch: UseQueryResult<PaginationResponse<TLanguageItemList>, Error>['refetch'];
}
