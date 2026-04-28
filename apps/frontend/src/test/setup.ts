import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

import "../i18n";

beforeEach(() => {
  window.localStorage.clear();
});
