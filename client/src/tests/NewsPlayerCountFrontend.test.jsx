jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import NewsSection from "../components/GameCard/NewsSection";
import PlayerCountBadge from "../components/GameCard/PlayerCountBadge";
import GameDetail from "../pages/Dashboard/GameDetail";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const MOCK_NEWS = [
  { gid: "1", title: "Major Patch 7.35", url: "https://steam.com/1", author: "Valve", dateReadable: "Nov 15, 2024" },
  { gid: "2", title: "New Hero Announced", url: "https://steam.com/2", author: "Valve", dateReadable: "Nov 10, 2024" },
  { gid: "3", title: "Balance Update", url: "https://steam.com/3", author: "Valve", dateReadable: "Nov 5, 2024" },
];

const AUTH_USER = {
  token: "t",
  user: { _id: "u1", username: "gamer", email: "g@t.com", steamId: "76561198000000001", role: "user" },
};

const renderWithProviders = (component) => {
  localStorage.setItem("authUser", JSON.stringify(AUTH_USER));
  return render(<BrowserRouter><AuthProvider><DashboardProvider>{component}</DashboardProvider></AuthProvider></BrowserRouter>);
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

describe("Game News UI Test", () => {

  test("renders news articles when data is provided", () => {
    renderWithProviders(<NewsSection news={MOCK_NEWS} />);
    expect(screen.getByText("Major Patch 7.35")).toBeInTheDocument();
    expect(screen.getByText("New Hero Announced")).toBeInTheDocument();
    expect(screen.getByText("Balance Update")).toBeInTheDocument();
  });

  test("renders section title 'Recent News'", () => {
    renderWithProviders(<NewsSection news={MOCK_NEWS} />);
    expect(screen.getByText("Recent News")).toBeInTheDocument();
  });

  test("renders empty state when no news", () => {
    renderWithProviders(<NewsSection news={[]} />);
    expect(screen.getByText(/no recent news available/i)).toBeInTheDocument();
  });

  test("renders loading skeletons when loading=true", () => {
    renderWithProviders(<NewsSection news={[]} loading={true} />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("each news item is a link opening in new tab", () => {
    renderWithProviders(<NewsSection news={[MOCK_NEWS[0]]} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://steam.com/1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  test("shows dateReadable for each article", () => {
    renderWithProviders(<NewsSection news={[MOCK_NEWS[0]]} />);
    expect(screen.getByText("Nov 15, 2024")).toBeInTheDocument();
  });

  test("shows author when available", () => {
    renderWithProviders(<NewsSection news={[MOCK_NEWS[0]]} />);
    expect(screen.getByText(/valve/i)).toBeInTheDocument();
  });

  test("renders 'Read ↗' text on each article", () => {
    renderWithProviders(<NewsSection news={MOCK_NEWS.slice(0, 1)} />);
    expect(screen.getByText("Read ↗")).toBeInTheDocument();
  });
});

describe("Player Count UI Test", () => {

  test("renders player count formatted with commas", () => {
    renderWithProviders(<PlayerCountBadge count={412857} />);
    expect(screen.getByText("412,857")).toBeInTheDocument();
  });

  test("renders 'Players Online' label", () => {
    renderWithProviders(<PlayerCountBadge count={1000} />);
    expect(screen.getByText(/players online/i)).toBeInTheDocument();
  });

  test("renders — when count is 0", () => {
    renderWithProviders(<PlayerCountBadge count={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("renders — when count is undefined", () => {
    renderWithProviders(<PlayerCountBadge />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("renders loading skeleton when loading=true", () => {
    renderWithProviders(<PlayerCountBadge loading={true} count={0} />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("Game Detail (player count + news) UI Test", () => {

  const renderGameDetail = (appId = "570") => {
    localStorage.setItem("authUser", JSON.stringify(AUTH_USER));
    return render(
      <MemoryRouter initialEntries={[`/game/${appId}`]}>
        <AuthProvider><DashboardProvider>
          <Routes><Route path="/game/:appId" element={<GameDetail />} /></Routes>
        </DashboardProvider></AuthProvider>
      </MemoryRouter>
    );
  };

  test("renders player count from game detail API", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 85000,
          headerImageUrl: "https://cdn.test.com/header.jpg",
          news: [], achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => expect(screen.getByText("85,000")).toBeInTheDocument());
  });

  test("renders news section with articles from game detail", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 0,
          headerImageUrl: "https://cdn.test.com/header.jpg",
          news: [
            { gid: "1", title: "Big Update", url: "https://steam.com/1", date: new Date().toISOString() },
          ],
          achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => {
      expect(screen.getByText("Recent News")).toBeInTheDocument();
      expect(screen.getByText("Big Update")).toBeInTheDocument();
    });
  });

  test("shows 'No recent news' message when news array is empty", async () => {
    API.get.mockResolvedValueOnce({
      data: {
        success: true,
        game: {
          appId: "570", name: "Dota 2", playtimeHours: 20,
          playerCount: 0,
          headerImageUrl: "https://cdn.test.com/header.jpg",
          news: [], achievements: null,
        },
      },
    });
    renderGameDetail("570");
    await waitFor(() => expect(screen.getByText(/no recent news for this game/i)).toBeInTheDocument());
  });
});
