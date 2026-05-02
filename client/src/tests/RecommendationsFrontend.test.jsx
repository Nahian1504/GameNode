jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), delete: jest.fn(), patch: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import RecommendationsSection from "../pages/Recommendations/RecommendationsSection";
import API from "../services/axiosConfig";

const AUTH_USER = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: null, role: "user" } };

const wrap = () => {
  localStorage.setItem("authUser", JSON.stringify(AUTH_USER));
  return render(<BrowserRouter><AuthProvider><DashboardProvider><RecommendationsSection /></DashboardProvider></AuthProvider></BrowserRouter>);
};

const MOCK_RECS_RESPONSE = {
  success: true, source: "generated",
  recommendations: [
    { name: "Hollow Knight", reason: "You love challenging games", matchPercent: 92, genre: "Metroidvania" },
    { name: "Hades", reason: "Fast paced like your top games", matchPercent: 88, genre: "Roguelike" },
    { name: "Dead Cells", reason: "Roguelike elements", matchPercent: 84, genre: "Roguelike" },
    { name: "Celeste", reason: "Precision platforming", matchPercent: 80, genre: "Platformer" },
    { name: "Ori", reason: "Beautiful art and exploration", matchPercent: 76, genre: "Platformer" },
  ],
  generatedAt: new Date().toISOString(),
  expiresAt:   new Date(Date.now() + 86400000).toISOString(),
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

describe("Recommendations UI Test", () => {

  test("renders section title and Get Recommendations button", () => {
    wrap();
    expect(screen.getByText(/AI Recommendations/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get recommendations/i })).toBeInTheDocument();
  });

  test("shows empty prompt state before any interaction", () => {
    wrap();
    expect(screen.getByText(/discover games you will love/i)).toBeInTheDocument();
  });

  test("shows loading skeletons while generating", async () => {
    API.post.mockImplementation(() => new Promise(() => {}));
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0));
  });

  test("renders 5 recommendation cards after successful fetch", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_RECS_RESPONSE });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => {
      expect(screen.getByText("Hollow Knight")).toBeInTheDocument();
      expect(screen.getByText("Hades")).toBeInTheDocument();
      expect(screen.getByText("Dead Cells")).toBeInTheDocument();
      expect(screen.getByText("Celeste")).toBeInTheDocument();
      expect(screen.getByText("Ori")).toBeInTheDocument();
    });
  });

  test("shows match percentage badge on each card", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_RECS_RESPONSE });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText("92%")).toBeInTheDocument());
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  test("shows reason text on each card", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_RECS_RESPONSE });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText("You love challenging games")).toBeInTheDocument());
  });

  test("shows genre badge on each card", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_RECS_RESPONSE });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText("Metroidvania")).toBeInTheDocument());
  });

  test("shows error message when API fails", async () => {
    API.post.mockRejectedValueOnce({ response: { status: 503, data: { message: "Recommendation service is temporarily unavailable." } } });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument());
  });

  test("shows rate limit message on 429 response", async () => {
    API.post.mockRejectedValueOnce({ response: { status: 429, data: { message: "Rate limit exceeded" } } });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText(/reached the recommendation limit/i)).toBeInTheDocument());
  });

  test("shows fallback message when user has too few games", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, source: "fallback", recommendations: [], message: "Connect your Steam account and play at least 3 games." } });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByText(/at least 3 games/i)).toBeInTheDocument());
  });

  test("shows Refresh button after recommendations are loaded", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_RECS_RESPONSE });
    wrap();
    fireEvent.click(screen.getByRole("button", { name: /get recommendations/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument());
  });
});
