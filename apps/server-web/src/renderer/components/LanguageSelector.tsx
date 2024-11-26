import { useTranslation } from 'react-i18next';
import { SelectComponent } from './Select';
import { useState } from 'react';
import { ILanguages } from '../libs/interfaces';
import { SettingPageTypeMessage } from '../../main/helpers/constant';

export const SUPPORTED_LANGUAGES: ILanguages[] = [
  { code: 'en', label: 'English' },
  { code: 'bg', label: 'Bulgarian' },
];

type LanguageSelector = {
  lang: string;
};
const LanguageSelector = ({ lang }: LanguageSelector) => {
  const [langs] = useState<ILanguages[]>(SUPPORTED_LANGUAGES);
  const { t } = useTranslation();

  const changeLanguage = (data: ILanguages) => {
    try {
      window.electron.ipcRenderer.sendMessage('setting-page', {
        type: SettingPageTypeMessage.langChange,
        data: data.code,
      });
      setLng(data.code);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const [lng, setLng] = useState<string>(lang);

  const language = langs.find((lg) => lg.code === lng) || {
    code: 'en',
    label: 'English',
  };
  return (
    <SelectComponent
      items={langs.map((i) => ({
        value: i.code,
        label: `LANGUAGES.${i.code}`,
      }))}
      title={t('FORM.LABELS.LANGUAGES')}
      defaultValue={language.code}
      onValueChange={(val) => {
        changeLanguage({ code: val });
      }}
      disabled={false}
      value={language.code}
    />
  );
};

export default LanguageSelector;
