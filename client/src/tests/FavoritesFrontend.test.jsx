jest.mock("../services/axiosConfig", () => ({ 
    __esModule: true, 
    default: { 
        post: jest.fn(), get: jest.fn(), delete: jest.fn(), 
        interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } } 
    },
 }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import FavoritesPage from "../pages/Favorites/FavoritesPage";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));

const MOCK_AUTH = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: "123", role: "user" } };
const MOCK_FAVORITES = [
  { appId: "570", name: "Dota 2", playtimeHours: 20, headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg", addedAt: new Date("2025-01-10").toISOString() },
  { appId: "730", name: "Counter-Strike 2", playtimeHours: 10, headerImageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg", addedAt: new Date("2025-01-05").toISOString() },
];

const renderPage = () => {
  localStorage.setItem("authUser", JSON.stringify(MOCK_AUTH));
  return render(<BrowserRouter><AuthProvider><DashboardProvider><FavoritesPage /></DashboardProvider></AuthProvider></BrowserRouter>);
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); mockNavigate.mockClear(); });

describe("Favorites UI Test", () => {
  test("shows empty state when no favorites", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: [], total: 0 } });
    renderPage();
    await waitFor(() => { expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument(); });
  });

  test("renders favorite game cards when favorites exist", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Dota 2")).toBeInTheDocument();
      expect(screen.getByText("Counter-Strike 2")).toBeInTheDocument();
    });
  });

  test("shows game count in header", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    renderPage();
    await waitFor(() => { expect(screen.getByText(/2 games saved/i)).toBeInTheDocument(); });
  });

  test("shows sort buttons when favorites exist", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /recently added/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /most played/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /name a.z/i })).toBeInTheDocument();
    });
  });

  test("clicking remove star calls toggleFavorite API", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    API.delete.mockResolvedValueOnce({ data: { success: true } });
    renderPage();
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });
    const removeButtons = screen.getAllByLabelText(/remove from favorites/i);
    fireEvent.click(removeButtons[0]);
    await waitFor(() => { expect(API.delete).toHaveBeenCalledWith("/api/favorites/570"); });
  });

  test("clicking a game card navigates to game detail", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    renderPage();
    await waitFor(() => { expect(screen.getByText("Dota 2")).toBeInTheDocument(); });
    const cards = screen.getAllByText("Dota 2");
    fireEvent.click(cards[0].closest("div[style*='cursor']") || cards[0]);
    await waitFor(() => { expect(mockNavigate).toHaveBeenCalledWith("/game/570"); });
  });

  test("shows playtime for each game", async () => {
    API.get.mockResolvedValueOnce({ data: { favorites: MOCK_FAVORITES, total: 2 } });
    renderPage();
    await waitFor(() => { expect(screen.getByText("20h")).toBeInTheDocument(); });
  });
  
  test("shows loading skeletons while fetching", () => {
    API.get.mockImplementation(() => new Promise(() => {}));
    renderPage();
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
