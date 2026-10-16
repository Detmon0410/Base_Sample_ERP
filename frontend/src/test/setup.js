import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

import i18n from "@/i18n";

// Texts are checked in English.
await i18n.changeLanguage("en");

// findBy* and waitFor wait 5 s, not 1 s: with every test file running at once, a page of the mock can take longer than 1 s to load.
configure({ asyncUtilTimeout: 5000 });
