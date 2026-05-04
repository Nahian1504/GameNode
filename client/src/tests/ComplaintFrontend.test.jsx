jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), patch: jest.fn(), delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import ComplaintModal from "../pages/Complaint/ComplaintModal";
import MyComplaintsPage from "../pages/Complaint/MyComplaintsPage";
import API from "../services/axiosConfig";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));

const AUTH_USER = { token: "t", user: { _id: "u1", username: "gamer", email: "g@t.com", steamId: null, role: "user" } };

const renderWithProviders = (component) => {
  localStorage.setItem("authUser", JSON.stringify(AUTH_USER));
  return render(<BrowserRouter><AuthProvider><DashboardProvider>{component}</DashboardProvider></AuthProvider></BrowserRouter>);
};

const MOCK_COMPLAINT_RESPONSE = {
  success: true,
  complaint: { _id: "c1", category: "Technical Issue", description: "Dashboard not loading.", aiResponse: "Try clearing your browser cache and reloading.", status: "pending", createdAt: new Date().toISOString() },
};

const MOCK_COMPLAINTS_LIST = [
  { _id: "c1", category: "Technical Issue", description: "Dashboard not loading.", aiResponse: "Try clearing cache.", status: "resolved",  createdAt: new Date().toISOString() },
  { _id: "c2", category: "AI Problem", description: "AI not responding.", aiResponse: "Try again later.", status: "escalated", createdAt: new Date().toISOString() },
  { _id: "c3", category: "Other", description: "General issue here.", aiResponse: "Contact support.", status: "pending", createdAt: new Date().toISOString() },
];

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); API.get.mockResolvedValue({ data: { favorites: [] } }); });

describe("ComplaintModal UI Test", () => {

  test("does not render when isOpen is false", () => {
    renderWithProviders(<ComplaintModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByText("Submit a Complaint")).not.toBeInTheDocument();
  });

  test("renders form when isOpen is true", () => {
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText("Submit a Complaint")).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  test("shows all 5 category options", () => {
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    const categories = ["Technical Issue", "AI Problem", "Inappropriate Content", "Account Issue", "Other"];
    categories.forEach((cat) => expect(screen.getByRole("option", { name: cat })).toBeInTheDocument());
  });

  test("shows validation error when submitting without category", async () => {
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByText(/please select a category/i)).toBeInTheDocument());
  });

  test("shows validation error when description is too short", async () => {
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Other" } });
    await userEvent.type(screen.getByPlaceholderText(/describe your issue/i), "Short");
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument());
  });

  test("shows AI response after successful submission", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_COMPLAINT_RESPONSE });
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Technical Issue" } });
    await userEvent.type(screen.getByPlaceholderText(/describe your issue/i), "Dashboard not loading games.");
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByText("AI Resolution Suggestion")).toBeInTheDocument());
    expect(screen.getByText(/try clearing your browser cache/i)).toBeInTheDocument();
  });

  test("shows Resolved and Escalate buttons after submission", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_COMPLAINT_RESPONSE });
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Other" } });
    await userEvent.type(screen.getByPlaceholderText(/describe your issue/i), "I have an issue with the platform features.");
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /yes, resolved/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /still need help/i })).toBeInTheDocument();
    });
  });

  test("shows success message after clicking Resolved", async () => {
    API.post.mockResolvedValueOnce({ data: MOCK_COMPLAINT_RESPONSE });
    API.patch.mockResolvedValueOnce({ data: { success: true } });
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Other" } });
    await userEvent.type(screen.getByPlaceholderText(/describe your issue/i), "I have an issue with the platform.");
    fireEvent.click(screen.getByRole("button", { name: /submit complaint/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /yes, resolved/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /yes, resolved/i }));
    await waitFor(() => expect(screen.getByText(/glad the suggestion helped/i)).toBeInTheDocument());
  });

  test("character counter updates as user types description", async () => {
    renderWithProviders(<ComplaintModal isOpen={true} onClose={jest.fn()} />);
    const textarea = screen.getByPlaceholderText(/describe your issue/i);
    await userEvent.type(textarea, "Hello");
    expect(screen.getByText(/5\/500/)).toBeInTheDocument();
  });
});

describe("MyComplaintsPage UI Test", () => {

  test("shows loading skeleton initially", () => {
    API.get.mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<MyComplaintsPage />);
    expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
  });

  test("displays complaint list after loading", async () => {
    API.get.mockResolvedValueOnce({ data: { complaints: MOCK_COMPLAINTS_LIST, total: 3 } });
    renderWithProviders(<MyComplaintsPage />);
    await waitFor(() => {
      expect(screen.getByText("Technical Issue")).toBeInTheDocument();
      expect(screen.getByText("AI Problem")).toBeInTheDocument();
    });
  });

  test("shows correct status badges", async () => {
    API.get.mockResolvedValueOnce({ data: { complaints: MOCK_COMPLAINTS_LIST, total: 3 } });
    renderWithProviders(<MyComplaintsPage />);
    await waitFor(() => {
      expect(screen.getByText("Resolved")).toBeInTheDocument();
      expect(screen.getByText("Escalated")).toBeInTheDocument();
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  test("shows empty state when no complaints", async () => {
    API.get.mockResolvedValueOnce({ data: { complaints: [], total: 0 } });
    renderWithProviders(<MyComplaintsPage />);
    await waitFor(() => expect(screen.getByText(/no complaints yet/i)).toBeInTheDocument());
  });

  test("expands AI response when complaint row is clicked", async () => {
    API.get.mockResolvedValueOnce({ data: { complaints: MOCK_COMPLAINTS_LIST, total: 3 } });
    renderWithProviders(<MyComplaintsPage />);
    await waitFor(() => expect(screen.getByText("Dashboard not loading.")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Dashboard not loading.").closest("div[style]"));
    await waitFor(() => expect(screen.getByText(/try clearing cache/i)).toBeInTheDocument());
  });

  test("shows error message when API fails", async () => {
    API.get.mockRejectedValueOnce({ response: { data: { message: "Failed to load complaints." } } });
    renderWithProviders(<MyComplaintsPage />);
    await waitFor(() => expect(screen.getByText(/failed to load complaints/i)).toBeInTheDocument());
  });
});
