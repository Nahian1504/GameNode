jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import Dashboard from "../pages/Dashboard/Dashboard";
import GameDetail from "../pages/Dashboard/GameDetail";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const MOCK_AUTH_WITH_STEAM = {
  token: "valid.jwt.token",
  user: { _id: "u1", username: "gamer", email: "g@test.com", steamId: "76561198000000001", role: "user" },
};
const MOCK_AUTH_NO_STEAM = {
  token: "valid.jwt.token",
  user: { _id: "u2", username: "newuser", email: "n@test.com", steamId: null, role: "user" },
};
const MOCK_GAMES_RESPONSE = {
  success: true,
  games: [
    { appId: "570", name: "Dota 2", playtimeHours: 20,  headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg" },
    { appId: "730", name: "Counter-Strike 2", playtimeHours: 10, headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg" },
    { appId: "440", name: "Team Fortress 2", playtimeHours: 0, headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/440/header.jpg" },
  ],
  total: 3, page: 1, totalPages: 1, totalPlaytimeHours: 30,
};

const renderDashboard = (authUser = null) => {
  if (authUser) localStorage.setItem("authUser", JSON.stringify(authUser));
  return render(
    <BrowserRouter>
      <AuthProvider><DashboardProvider><Dashboard /></DashboardProvider></AuthProvider>
    </BrowserRouter>
  );
};

const renderGameDetail = (appId = "570") => {
  return render(
    <MemoryRouter initialEntries={[`/game/${appId}`]}>
      <AuthProvider><DashboardProvider>
        <Routes>
          <Route path="/game/:appId" element={<GameDetail />} />
        </Routes>
      </DashboardProvider></AuthProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockNavigate.mockClear();
  API.get.mockResolvedValue({ data: { favorites: [] } });
});

describe("Dashboard UI Test", () => {

  test("renders sort buttons — Most Played, Name A-Z, Recently Played", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("/api/steam/dashboard")) return Promise.resolve({ data: MOCK_GAMES_RESPONSE });
      return Promise.resolve({ data: { favorites: [] } });
    });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });
    expect(screen.getByRole("button", { name: /most played/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /name a.z/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recently played/i })).toBeInTheDocument();
  });

  test("clicking Name A-Z calls fetchGames with sort=name", async () => {
    API.get.mockResolvedValue({ data: MOCK_GAMES_RESPONSE });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /name a.z/i }));

    await waitFor(() => {
      const calls = API.get.mock.calls.map((c) => c[0]);
      expect(calls.some((url) => url.includes("sort=name"))).toBe(true);
    });
  });

  test("shows total playtime stat in header", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("/api/steam/dashboard")) return Promise.resolve({ data: MOCK_GAMES_RESPONSE });
      return Promise.resolve({ data: { favorites: [] } });
    });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => {
      expect(screen.getByText(/30h total playtime/i)).toBeInTheDocument();
    });
  });

  test("shows game count and total playtime when library loads", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("/api/steam/dashboard")) return Promise.resolve({ data: MOCK_GAMES_RESPONSE });
      return Promise.resolve({ data: { favorites: [] } });
    });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => {
      expect(screen.getByText(/3 games/i)).toBeInTheDocument();
    });
  });

  test("clicking a game card navigates to /game/:appId", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("/api/steam/dashboard")) return Promise.resolve({ data: MOCK_GAMES_RESPONSE });
      return Promise.resolve({ data: { favorites: [] } });
    });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });

    // Click the game card
    const cards = document.querySelectorAll("[style*='cursor: pointer']");
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("/game/"));
    });
  });

  test("search filter still works with sort controls visible", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("/api/steam/dashboard")) return Promise.resolve({ data: MOCK_GAMES_RESPONSE });
      return Promise.resolve({ data: { favorites: [] } });
    });
    renderDashboard(MOCK_AUTH_WITH_STEAM);
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });

    const searchInput = screen.getByPlaceholderText(/search your games/i);
    await userEvent.type(searchInput, "dota");
    expect(screen.getByText("Dota 2")).toBeInTheDocument();
    expect(screen.queryByText("Counter-Strike 2")).not.toBeInTheDocument();
  });
});

describe("Game Detail UI Test", () => {

  test("renders loading skeleton initially", () => {
    API.get.mockImplementation(() => new Promise(() => {})); 
    renderGameDetail("570");
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("renders game name and playtime after data loads", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570",
          name: "Dota 2",
          playtimeHours: 20,
          playerCount: 412857,
          headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg",
          news: [],
          achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
      expect(screen.getByText("20h")).toBeInTheDocument();
    });
  });

  test("shows player count badge", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 412857,
          headerImageUrl: "https://test.com/header.jpg",
          news: [], achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText("412,857")).toBeInTheDocument();
    });
  });

  test("shows recent news articles when available", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 0,
          headerImageUrl: "https://test.com/header.jpg",
          news: [
            { gid: "1", title: "Big Patch 7.35", url: "https://steam.com/news/1", date: new Date().toISOString() },
          ],
          achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText("Recent News")).toBeInTheDocument();
      expect(screen.getByText("Big Patch 7.35")).toBeInTheDocument();
    });
  });

  test("shows achievement summary when data is available", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 0,
          headerImageUrl: "https://test.com/header.jpg",
          news: [],
          achievements: { total: 10, unlocked: 7, locked: 3, percent: 70 },
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText("7 / 10")).toBeInTheDocument();
    });
  });

  test("shows error message when API call fails", async () => {
    API.get.mockRejectedValueOnce({
      response: { data: { message: "Failed to load game details. Please try again." } },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText(/failed to load game details/i)).toBeInTheDocument();
    });
  });

  test("back button navigates to dashboard", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: { appId: "570", name: "Dota 2", playtimeHours: 20, playerCount: 0, headerImageUrl: "https://test.com/h.jpg", news: [], achievements: null },
      },
    });
    renderGameDetail("570");
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });

    fireEvent.click(screen.getByText(/back to library/i));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  test("view achievements link goes to /achievements/:appId", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: { appId: "570", name: "Dota 2", playtimeHours: 20, playerCount: 0, headerImageUrl: "https://test.com/h.jpg", news: [], achievements: null },
      },
    });
    renderGameDetail("570");
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });

    const achLink = screen.getByRole("link", { name: /achievements/i });
    expect(achLink.getAttribute("href")).toBe("/achievements/570");
  });
});
