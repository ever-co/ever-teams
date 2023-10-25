import type { MessageTypesToBackgroundEnum } from '~typescript/enums/MessageTypesEnum';
import type { MessageTypesFromBackgroundEnum } from '~typescript/enums/MessageTypesEnum';

export interface IPostMessage<T = any> {
	type: MessageTypesToBackgroundEnum | MessageTypesFromBackgroundEnum;
	payload?: T;
}
