// Mock axios to avoid real network calls in unit tests
jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import React from "react";
import API from "../services/axiosConfig";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Dashboard from "../pages/Dashboard/Dashboard";
import SteamConnect from "../pages/Steam/SteamConnect";

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Helper to render with all providers
const renderWithProviders = (component, initialAuthUser = null) => {
  if (initialAuthUser) {
    localStorage.setItem("authUser", JSON.stringify(initialAuthUser));
  }
  return render(
    <BrowserRouter>
      <AuthProvider>
        <DashboardProvider>
          {component}
        </DashboardProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

// User story 1: Register Page UI Tests
describe("Register Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders all form fields", () => {
    renderWithProviders(<Register />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("shows validation error for short username", async () => {
    renderWithProviders(<Register />);
    const usernameInput = screen.getByLabelText(/username/i);
    await userEvent.type(usernameInput, "ab");
    fireEvent.blur(usernameInput);
    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for invalid email", async () => {
    renderWithProviders(<Register />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "notanemail");
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for weak password (no number)", async () => {
    renderWithProviders(<Register />);
    const pwInput = screen.getByLabelText(/^password/i);
    await userEvent.type(pwInput, "NoNumbers!");
    fireEvent.blur(pwInput);
    await waitFor(() => {
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for mismatched passwords", async () => {
    renderWithProviders(<Register />);
    await userEvent.type(screen.getByLabelText(/^password/i), "SecurePass1!");
    const confirmInput = screen.getByLabelText(/confirm password/i);
    await userEvent.type(confirmInput, "DifferentPass1!");
    fireEvent.blur(confirmInput);
    await waitFor(() => {
      expect(screen.getByText(/do not match/i)).toBeInTheDocument();
    });
  });

  test("calls register API with correct data on valid submit", async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: "fake.jwt.token",
        user: { username: "testuser", email: "test@test.com", _id: "123" },
      },
    });

    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "test@test.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "SecurePass1!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "SecurePass1!");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith("/api/auth/register", {
        username: "testuser",
        email: "test@test.com",
        password: "SecurePass1!",
      });
    });
  });

  test("shows server error message when API returns error", async () => {
    API.post.mockRejectedValueOnce({
      response: { data: { message: "This email is already registered." } },
    });

    renderWithProviders(<Register />);

    await userEvent.type(screen.getByLabelText(/username/i), "testuser");
    await userEvent.type(screen.getByLabelText(/email/i), "taken@test.com");
    await userEvent.type(screen.getByLabelText(/^password/i), "SecurePass1!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "SecurePass1!");

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already registered/i)).toBeInTheDocument();
    });
  });
});

// User story 2: Login Page UI Tests
describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders email and password fields", () => {
    renderWithProviders(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test("shows error for invalid email format", async () => {
    renderWithProviders(<Login />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "badformat");
    fireEvent.blur(emailInput);
    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  test("shows error for empty password", async () => {
    renderWithProviders(<Login />);
    const pwInput = screen.getByLabelText(/password/i);
    fireEvent.focus(pwInput);
    fireEvent.blur(pwInput);
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test("calls login API with correct credentials", async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: "fake.jwt.token",
        user: { username: "gamer", email: "gamer@test.com", _id: "456" },
      },
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), "gamer@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "SecurePass1!");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "gamer@test.com",
        password: "SecurePass1!",
      });
    });
  });

  test("shows error message on failed login", async () => {
    API.post.mockRejectedValueOnce({
      response: { data: { message: "Invalid email or password." } },
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), "wrong@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "WrongPass1!");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  test("stores token in localStorage on successful login", async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: "valid.jwt.token",
        user: { username: "gamer", email: "gamer@test.com", _id: "456" },
      },
    });

    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), "gamer@test.com");
    await userEvent.type(screen.getByLabelText(/password/i), "SecurePass1!");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const stored = localStorage.getItem("authUser");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed.token).toBe("valid.jwt.token");
    });
  });
});