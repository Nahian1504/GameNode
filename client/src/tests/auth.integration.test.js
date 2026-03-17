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

import API from "../services/axiosConfig";

// Mock data for Steam API test
const MOCK_GAMES_RESPONSE = {
  success: true,
  games: [
    {
      appId: "570",
      name: "Dota 2",
      playtimeHours: 20,
      imgIconUrl: "abc123",
      headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg",
    },
    {
      appId: "730",
      name: "Counter-Strike 2",
      playtimeHours: 10,
      imgIconUrl: "def456",
      headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    },
    {
      appId: "440",
      name: "Team Fortress 2",
      playtimeHours: 0,
      imgIconUrl: null,
      headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg",
    },
  ],
  total: 3,
  page: 1,
  totalPages: 1,
};

// Authenticated user WITH Steam linked
const MOCK_AUTH_USER_WITH_STEAM = {
  token: "valid.jwt.token",
  user: {
    _id: "user123",
    username: "steamgamer",
    email: "steam@test.com",
    steamId: "76561198000000001",
    role: "user",
  },
};

// Authenticated user WITHOUT Steam linked
const MOCK_AUTH_USER_NO_STEAM = {
  token: "valid.jwt.token",
  user: {
    _id: "user456",
    username: "newgamer",
    email: "new@test.com",
    steamId: null,
    role: "user",
  },
};

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

// User story 4: Steam Game Library UI Tests
describe("Dashboard Page — Steam Game Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("shows 'Connect Steam' prompt when user has no Steam ID linked", async () => {
    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_NO_STEAM);

    await waitFor(() => {
      expect(screen.getByText(/connect your steam account/i)).toBeInTheDocument();
    });
  });

  test("shows 'Connect Steam' button linking to /steam/connect", async () => {
    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_NO_STEAM);

    await waitFor(() => {
      const connectBtn = screen.getByRole("link", { name: /connect steam/i });
      expect(connectBtn).toBeInTheDocument();
      expect(connectBtn.getAttribute("href")).toBe("/steam/connect");
    });
  });

  test("fetches and displays game library when Steam ID is linked", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    await waitFor(() => {
      expect(API.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/steam/dashboard")
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
      expect(screen.getByText("Counter-Strike 2")).toBeInTheDocument();
      expect(screen.getByText("Team Fortress 2")).toBeInTheDocument();
    });
  });

  test("displays playtime correctly for each game card", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    await waitFor(() => {
      expect(screen.getByText(/20\.0h played/i)).toBeInTheDocument();
      expect(screen.getByText(/not played/i)).toBeInTheDocument();
    });
  });

  test("shows total game count in header when library loads", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    await waitFor(() => {
      expect(screen.getByText(/3 games in your steam library/i)).toBeInTheDocument();
    });
  });

  test("shows loading skeletons while games are being fetched", async () => {
    // Delay the API response so we can check loading state
    API.get.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: MOCK_GAMES_RESPONSE }), 500))
    );

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("shows error message when Steam API fails", async () => {
    API.get.mockRejectedValueOnce({
      response: {
        data: { message: "Steam API is temporarily unavailable. Please try again." },
      },
    });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);
    await waitFor(() => {
      expect(screen.getByText(/steam api is temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  test("shows empty library message when user has no games", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        games: [],
        total: 0,
        page: 1,
        totalPages: 0,
        message: "No games found in your Steam library.",
      },
    });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);
    await waitFor(() => {
      expect(screen.getByText(/no games found/i)).toBeInTheDocument();
    });
  });

  test("filters games by search query client-side", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    // Wait for games to load
    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search your games/i);
    await userEvent.type(searchInput, "dota");
    expect(screen.getByText("Dota 2")).toBeInTheDocument();
    expect(screen.queryByText("Counter-Strike 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Fortress 2")).not.toBeInTheDocument();
  });

  test("shows 'no results' message when search finds nothing", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);
    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search your games/i);
    await userEvent.type(searchInput, "zzznomatch");

    await waitFor(() => {
      expect(screen.getByText(/no games match/i)).toBeInTheDocument();
    });
  });

  test("clears search and shows all games again", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_GAMES_RESPONSE });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search your games/i);
    await userEvent.type(searchInput, "zzznomatch");

    await waitFor(() => {
      expect(screen.getByText(/no games match/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /clear search/i }));

    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
      expect(screen.getByText("Counter-Strike 2")).toBeInTheDocument();
    });
  });

  test("shows pagination controls when totalPages > 1", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        ...MOCK_GAMES_RESPONSE,
        total: 25,
        totalPages: 3,
        page: 1,
      },
    });

    renderWithProviders(<Dashboard />, MOCK_AUTH_USER_WITH_STEAM);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    });
  });
});


describe("SteamConnect Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
  });

  test("renders Steam ID input field and submit button", () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    expect(screen.getByLabelText(/steam id/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connect steam account/i })
    ).toBeInTheDocument();
  });

  test("shows how-to-find Steam ID guide on the page", () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);
    expect(screen.getByText(/how to find your steam id/i)).toBeInTheDocument();
  });

  test("shows validation error for Steam ID shorter than 17 digits", async () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    const input = screen.getByLabelText(/steam id/i);
    await userEvent.type(input, "12345");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/17 digits/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for Steam ID longer than 17 digits", async () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    const input = screen.getByLabelText(/steam id/i);
    await userEvent.type(input, "765611980000000001234"); // too long
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/17 digits/i)).toBeInTheDocument();
    });
  });

  test("shows validation error for Steam ID containing letters", async () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    const input = screen.getByLabelText(/steam id/i);
    await userEvent.type(input, "7656119800000000X");
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/17 digits/i)).toBeInTheDocument();
    });
  });

  test("calls POST /api/steam/connect with correct Steam ID on valid submit", async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Steam account connected successfully!",
        steamProfile: {
          steamId: "76561198000000001",
          personaName: "TestGamer",
        },
      },
    });

    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    await userEvent.type(
      screen.getByLabelText(/steam id/i),
      "76561198000000001"
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect steam account/i })
    );

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith("/api/steam/connect", {
        steamId: "76561198000000001",
      });
    });
  });

  test("shows success message after successful Steam connection", async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Steam account connected successfully!",
        steamProfile: {
          steamId: "76561198000000001",
          personaName: "TestGamer",
        },
      },
    });

    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    await userEvent.type(
      screen.getByLabelText(/steam id/i),
      "76561198000000001"
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect steam account/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/steam account connected/i)).toBeInTheDocument();
      expect(screen.getByText(/TestGamer/i)).toBeInTheDocument();
    });
  });

  test("shows error message when Steam profile is private", async () => {
    API.post.mockRejectedValueOnce({
      response: {
        data: {
          message:
            "Steam profile is private. Please make it public to use GameNode.",
        },
      },
    });

    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    await userEvent.type(
      screen.getByLabelText(/steam id/i),
      "76561198000000001"
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect steam account/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/private/i)).toBeInTheDocument();
    });
  });

  test("shows error message when Steam ID is not found", async () => {
    API.post.mockRejectedValueOnce({
      response: {
        data: { message: "Steam ID not found" },
      },
    });

    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_NO_STEAM);

    await userEvent.type(
      screen.getByLabelText(/steam id/i),
      "76561198999999999"
    );
    fireEvent.click(
      screen.getByRole("button", { name: /connect steam account/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  test("shows 'Already Connected' view when user already has Steam linked", () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_WITH_STEAM);

    expect(screen.getByText(/steam already connected/i)).toBeInTheDocument();
    expect(screen.getByText("76561198000000001")).toBeInTheDocument();
  });

  test("shows 'Go to Dashboard' button when Steam is already connected", () => {
    renderWithProviders(<SteamConnect />, MOCK_AUTH_USER_WITH_STEAM);

    const dashboardBtn = screen.getByRole("button", { name: /go to dashboard/i });
    expect(dashboardBtn).toBeInTheDocument();
  });
});