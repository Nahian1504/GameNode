jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), put: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import LeaderboardPage from "../pages/Leaderboard/LeaderboardPage";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const AUTH_USER = { token: "t", user: { _id: "u1", username: "gamer", email: "g@t.com", steamId: null, role: "user" } };
const MOCK_ENTRIES = [
  { _id: "e1", playerName: "ProGamer", game: "Dota 2", score: 9500, notes: "Season best", isPublic: true,  createdAt: new Date().toISOString() },
  { _id: "e2", playerName: "Newbie", game: "CS2", score: 1200, notes: "", isPublic: false, createdAt: new Date().toISOString() },
  { _id: "e3", playerName: "Veteran",  game: "Dota 2", score: 7800, notes: "Fun match",   isPublic: true,  createdAt: new Date().toISOString() },
];

const renderPage = (authUser = AUTH_USER) => {
  if (authUser) localStorage.setItem("authUser", JSON.stringify(authUser));
  return render(
    <BrowserRouter><AuthProvider><DashboardProvider><LeaderboardPage /></DashboardProvider></AuthProvider></BrowserRouter>
  );
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); API.get.mockResolvedValue({ data: { entries: [], total: 0 } }); });

describe("Leaderboard UI Test", () => {

  test("renders page title and Add Entry button", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Leaderboard")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /add entry/i })).toBeInTheDocument();
  });

  test("shows empty state when no entries", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no entries yet/i)).toBeInTheDocument());
  });

  test("displays entries in a table when data loads", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ProGamer")).toBeInTheDocument();
      expect(screen.getByText("Newbie")).toBeInTheDocument();
      expect(screen.getByText("Veteran")).toBeInTheDocument();
    });
  });

  test("shows medal icons for top 3 positions", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("ProGamer")).toBeInTheDocument());
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
  });

  test("shows score values in table", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("9,500")).toBeInTheDocument());
    expect(screen.getByText("1,200")).toBeInTheDocument();
  });

  test("shows game filter buttons when entries have different games", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Dota 2")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Dota 2$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^CS2$/ })).toBeInTheDocument();
  });

  test("clicking game filter button filters entries", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("ProGamer")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^CS2$/ }));
    await waitFor(() => {
      expect(screen.getByText("Newbie")).toBeInTheDocument();
      expect(screen.queryByText("ProGamer")).not.toBeInTheDocument();
    });
  });

  test("opens Add modal when Add Entry button is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /add entry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add entry/i }));
    expect(screen.getByText("Add Entry")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. YourUsername/i)).toBeInTheDocument();
  });

  test("modal closes when Cancel is clicked", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /add entry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add entry/i }));
    expect(screen.getByText("Add Entry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByPlaceholderText(/e.g. YourUsername/i)).not.toBeInTheDocument());
  });

  test("shows validation error when submitting empty form", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /add entry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add entry/i }));
    fireEvent.click(screen.getByRole("button", { name: /^add entry$/i }));
    await waitFor(() => expect(screen.getByText(/player name.*game.*score are required/i)).toBeInTheDocument());
  });

  test("calls POST /api/leaderboard on valid form submit", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, entry: { _id: "e99", playerName: "NewPro", game: "CS2", score: 5000, notes: "", isPublic: false } } });
    API.get.mockResolvedValue({ data: { entries: [], total: 0 } });
    renderPage();
    await waitFor(() => expect(screen.getByRole("button", { name: /add entry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add entry/i }));
    await userEvent.type(screen.getByPlaceholderText(/e.g. YourUsername/i), "NewPro");
    await userEvent.type(screen.getByPlaceholderText(/e.g. Dota 2/i), "CS2");
    await userEvent.type(screen.getByPlaceholderText(/e.g. 9500/i), "5000");
    fireEvent.click(screen.getByRole("button", { name: /^add entry$/i }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/leaderboard", expect.objectContaining({ playerName: "NewPro", game: "CS2", score: 5000 })));
  });

  test("opens edit modal with pre-filled data on Edit click", async () => {
    API.get.mockResolvedValueOnce({ data: { entries: MOCK_ENTRIES, total: 3 } });
    renderPage();
    await waitFor(() => expect(screen.getByText("ProGamer")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: /edit/i })[0]);
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/e.g. YourUsername/i);
      expect(input.value).toBe("ProGamer");
    });
  });

  test("shows error message when API call fails", async () => {
    API.get.mockRejectedValueOnce({ response: { data: { message: "Server error loading leaderboard." } } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/server error loading leaderboard/i)).toBeInTheDocument());
  });
});
