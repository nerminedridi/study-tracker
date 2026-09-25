import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import App from "./App";
import { StoreProvider } from "./store/StoreProvider";
import { STORAGE_KEY } from "./store/storage";
import { TimerProvider } from "./timer/TimerProvider";

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <TimerProvider>
          <App />
        </TimerProvider>
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("shows the welcome guide for a new user", () => {
    renderApp();
    expect(screen.getByText("Welcome 👋")).toBeInTheDocument();
  });

  it("adds a course and a lesson, and saves them", async () => {
    const user = userEvent.setup();
    renderApp("/courses");

    await user.type(screen.getByPlaceholderText("e.g. Linear Algebra"), "Chemistry");
    await user.click(screen.getByRole("button", { name: /add course/i }));
    await user.click(screen.getByRole("link", { name: /chemistry/i }));

    await user.type(screen.getByLabelText("New lesson"), "Atoms{Enter}");
    await user.click(screen.getByLabelText("Mark Atoms done"));
    expect(screen.getByText("100%")).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.courses[0]).toMatchObject({ name: "Chemistry", lessons: [{ name: "Atoms", done: true }] });
  });

  it("adds and completes a task", async () => {
    const user = userEvent.setup();
    renderApp("/tasks");

    await user.type(screen.getByPlaceholderText(/problem set/i), "Revise notes");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(screen.getByText("Revise notes")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Mark Revise notes done"));
    expect(screen.getByText("All clear ✨")).toBeInTheDocument();
  });
});
