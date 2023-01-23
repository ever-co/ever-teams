import {
  ILanguageItemList,
} from "@app/interfaces/IUserData";
import api from "../axios";

export function getLanguageListAPI(is_system: boolean) {
  return api.get<ILanguageItemList>(`/languages?is_system=${is_system}`);
}
