import { ILanguageItemList } from "@app/interfaces/IUserData";
import { atom, selector } from "recoil";

export const languageListState = atom<ILanguageItemList[]>({
    key: "languageListState",
    default: [],
  });
  
  export const activeLanguageIdState = atom<string | null>({
    key: "activeLanguageIdState",
    default: null,
  });

export const languagesFetchingState = atom<boolean>({
    key: "languagesFetchingState",
    default: false,
});

export const activeLanguageState = selector<ILanguageItemList | null>({
    key: "activeLanguageState",
    get: ({ get }) => {
      const languages = get(languageListState);
      const activeId = get(activeLanguageIdState);
      return languages.find((language) => language.code === activeId) || languages[0] || null;
    },
  });