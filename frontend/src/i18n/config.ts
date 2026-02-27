"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translationEn, translationId, translationJa } from "./locales";

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: translationEn },
            id: { translation: translationId },
            ja: { translation: translationJa }
        },
        lng: "id", // Default to Indonesian
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
