import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "Welcome": "Welcome",
      "Dashboard": "Dashboard",
      "Applications": "Applications",
      "Apply": "Apply Now",
      "Logout": "Logout",
      "Status": "Status",
      "Total Applications": "Total Applications",
      "Draft": "Draft",
      "Submitted": "Submitted",
      "Settings": "Settings"
    }
  },
  hi: {
    translation: {
      "Welcome": "स्वागत हे",
      "Dashboard": "डैशबोर्ड",
      "Applications": "आवेदन",
      "Apply": "अभी आवेदन करें",
      "Logout": "लॉग आउट",
      "Status": "स्थिति",
      "Total Applications": "कुल आवेदन",
      "Draft": "मसौदा",
      "Submitted": "प्रस्तुत किया गया",
      "Settings": "सेटिंग्स"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
