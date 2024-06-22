import i18n from 'i18next';
import backend from 'i18next-fs-backend';
import { app } from 'electron';

import path from 'path';
const prependPath = app.isPackaged
    ? path.join(process.resourcesPath)
    : path.join(__dirname, '..');

i18n.use(backend).init({
  backend: {
    loadPath: prependPath + '/src/locales/{{lng}}/{{ns}}.json',
    addPath: prependPath + '/src/locales/{{lng}}/{{ns}}.missing.json'
  },
  debug: false,
  ns: 'translation',
  saveMissing: true,
  saveMissingTo: 'current',
  lng: 'en',
  fallbackLng: false, // set to false when generating translation files locally
  supportedLngs: ['en', 'bg']
});

export default i18n;
