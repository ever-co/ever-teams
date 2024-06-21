import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

i18n
  .use(
    resourcesToBackend((language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`))
  )
  .init({
    debug: true,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // not needed for react as it escapes by default
    }
  });
i18n.on('failedLoading', (lng, ns, msg) => console.error(msg))
i18n.languages = ['en'];

export default i18n;
