jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import AchievementsPage from "../pages/Achievements/AchievementsPage";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const MOCK_AUTH = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: "123", role: "user" } };

const MOCK_RESPONSE = {
  success: true,
  appId: "570",
  summary: { total: 3, unlocked: 2, locked: 1, percent: 67 },
  achievements: [
    { apiName: "WIN_1", displayName: "First Win", description: "Win a game", achieved: true, unlockTime: 1700000000, globalPercent: 80, iconUrl: null, iconUrlGray: null },
    { apiName: "WIN_10", displayName: "Ten Wins", description: "Win 10 games", achieved: true, unlockTime: 1699000000, globalPercent: 40, iconUrl: null, iconUrlGray: null },
    { apiName: "WIN_100", displayName: "Hundred Wins", description: "Win 100 games", achieved: false, unlockTime: 0, globalPercent: 4.2, iconUrl: null, iconUrlGray: null },
  ],
};

const renderPage = (appId = "570") => {
  localStorage.setItem("authUser", JSON.stringify(MOCK_AUTH));
  return render(
    <MemoryRouter initialEntries={[`/achievements/${appId}`]}>
      <AuthProvider><DashboardProvider>
        <Routes>
          <Route path="/achievements/:appId" element={<AchievementsPage />} />
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

describe("Achievements UI Test", () => {

  test("shows loading skeletons while fetching", () => {
    API.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("renders achievement names after loading", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("First Win")).toBeInTheDocument();
      expect(screen.getByText("Ten Wins")).toBeInTheDocument();
      expect(screen.getByText("Hundred Wins")).toBeInTheDocument();
    });
  });

  test("renders progress bar with correct percentage", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("67% complete")).toBeInTheDocument();
    });
  });

  test("renders unlocked count correctly", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("2 / 3")).toBeInTheDocument();
    });
  });

  test("filter tabs render — All, Unlocked, Locked", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /all \(3\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /unlocked \(2\)/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /locked \(1\)/i })).toBeInTheDocument();
    });
  });

  test("clicking Unlocked tab shows only unlocked achievements", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => { expect(screen.getByText("First Win")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /unlocked \(2\)/i }));
    expect(screen.getByText("First Win")).toBeInTheDocument();
    expect(screen.getByText("Ten Wins")).toBeInTheDocument();
    expect(screen.queryByText("Hundred Wins")).not.toBeInTheDocument();
  });

  test("clicking Locked tab shows only locked achievements", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => { expect(screen.getByText("First Win")).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole("button", { name: /locked \(1\)/i }));
    expect(screen.queryByText("First Win")).not.toBeInTheDocument();
    expect(screen.getByText("Hundred Wins")).toBeInTheDocument();
  });

  test("shows rarity percentage on achievement cards", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => { expect(screen.getByText(/80% of players/i)).toBeInTheDocument(); });
  });

  test("shows Rare badge for achievements with <5% global unlock", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/rare/i)).toBeInTheDocument();
    });
  });

  test("shows error message when API call fails", async () => {
    API.get.mockRejectedValueOnce({ response: { data: { message: "Failed to load achievements. Please try again." } } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load achievements/i)).toBeInTheDocument();
    });
  });

  test("back button navigates to /game/:appId", async () => {
    API.get.mockResolvedValueOnce({ data: MOCK_RESPONSE });
    renderPage("570");
    await waitFor(() => { expect(screen.getByText("First Win")).toBeInTheDocument(); });
    fireEvent.click(screen.getByText(/back to game/i));
    expect(mockNavigate).toHaveBeenCalledWith("/game/570");
  });
});
