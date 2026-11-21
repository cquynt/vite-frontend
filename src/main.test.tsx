import { waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./App", () => ({ App: () => <div data-testid="app-stub">app</div> }));
vi.mock("./styles.css", () => ({}));

describe("main", () => {
  it("render App vào #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("./main");
    await waitFor(() => {
      expect(document.querySelector('#root [data-testid="app-stub"]')?.textContent).toBe("app");
    });
  });
});
