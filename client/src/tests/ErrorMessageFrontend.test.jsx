jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import Dashboard from "../pages/Dashboard/Dashboard";
import AchievementsPage from "../pages/Achievements/AchievementsPage";
import FavoritesPage from "../pages/Favorites/FavoritesPage";
import LeaderboardPage from "../pages/Leaderboard/LeaderboardPage";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));

const AUTH_STEAM = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: "76561198000000001", role: "user" } };
const AUTH_NO_STEAM = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: null, role: "user" } };

const wrap = (component, auth = AUTH_STEAM) => {
  localStorage.setItem("authUser", JSON.stringify(auth));
  return render(<BrowserRouter><AuthProvider><DashboardProvider>{component}</DashboardProvider></AuthProvider></BrowserRouter>);
};

const wrapPath = (path, element, auth = AUTH_STEAM) => {
  localStorage.setItem("authUser", JSON.stringify(auth));
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><DashboardProvider><Routes><Route path={path} element={element} /></Routes></DashboardProvider></AuthProvider></MemoryRouter>);
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); API.get.mockResolvedValue({ data: { favorites: [], entries: [], complaints: [] } }); });

describe("Frontend error message display Test", () => {

  test("Dashboard shows specific Steam unavailable message on 503", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("dashboard")) return Promise.reject({ response: { data: { message: "Steam API is temporarily unavailable. Please try again." } } });
      return Promise.resolve({ data: { favorites: [] } });
    });
    wrap(<Dashboard />, AUTH_STEAM);
    await waitFor(() => expect(screen.getByText(/steam api is temporarily unavailable/i)).toBeInTheDocument());
  });

  test("Dashboard shows specific expired token message on 401", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("dashboard")) return Promise.reject({ response: { data: { message: "Your session has expired. Please log in again." } } });
      return Promise.resolve({ data: { favorites: [] } });
    });
    wrap(<Dashboard />, AUTH_STEAM);
    await waitFor(() => expect(screen.getByText(/session has expired/i)).toBeInTheDocument());
  });

  test("AchievementsPage shows specific error for no achievements", async () => {
    API.get.mockRejectedValueOnce({ response: { data: { message: "Achievements not available for this game." } } });
    wrapPath("/achievements/570", <AchievementsPage />);
    await waitFor(() => expect(screen.getByText(/achievements not available/i)).toBeInTheDocument());
  });

  test("FavoritesPage shows error message on API failure", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("favorites")) return Promise.reject({ response: { data: { message: "Failed to load your favorites." } } });
      return Promise.resolve({ data: { favorites: [] } });
    });
    wrap(<FavoritesPage />);
    await waitFor(() => expect(screen.getByText(/failed to load your favorites/i)).toBeInTheDocument());
  });

  test("LeaderboardPage shows error message on API failure", async () => {
    API.get.mockRejectedValueOnce({ response: { data: { message: "Failed to load leaderboard." } } });
    wrap(<LeaderboardPage />);
    await waitFor(() => expect(screen.getByText(/failed to load leaderboard/i)).toBeInTheDocument());
  });

  test("Dashboard error alert has dismiss button", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("dashboard")) return Promise.reject({ response: { data: { message: "Steam API is temporarily unavailable. Please try again." } } });
      return Promise.resolve({ data: { favorites: [] } });
    });
    wrap(<Dashboard />, AUTH_STEAM);
    await waitFor(() => expect(screen.getByText("✕")).toBeInTheDocument());
  });

  test("error messages are specific strings not generic 'Something went wrong'", async () => {
    API.get.mockImplementation((url) => {
      if (url.includes("dashboard")) return Promise.reject({ response: { data: { message: "Steam API is temporarily unavailable. Please try again." } } });
      return Promise.resolve({ data: { favorites: [] } });
    });
    wrap(<Dashboard />, AUTH_STEAM);
    await waitFor(() => {
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
      expect(screen.getByText(/steam api is temporarily unavailable/i)).toBeInTheDocument();
    });
  });
});
