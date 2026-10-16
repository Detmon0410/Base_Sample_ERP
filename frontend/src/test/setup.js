import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

import i18n from "@/i18n";

// Texts are checked in English.
await i18n.changeLanguage("en");

// A page loads its data from the mock with a small delay; with the whole suite running at once a find can need more than the 1 s of the default.
configure({ asyncUtilTimeout: 4000 });
