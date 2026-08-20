import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./AuthPage";

const enterDemo = vi.fn();
const navigate = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    resetPassword: vi.fn(),
    enterDemo,
    user: null,
    role: null,
    accessLoading: false,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

describe("AuthPage demo access", () => {
  beforeEach(() => {
    enterDemo.mockClear();
    navigate.mockClear();
  });

  it("offers a clearly labelled read-only demo entry", () => {
    render(<AuthPage />);

    expect(screen.getByText("Vista de prueba · sin acceso a datos reales")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Entrar en modo demo" }));

    expect(enterDemo).toHaveBeenCalledOnce();
  });
});
