jest.mock("../services/axiosConfig", () => ({
  __esModule: true,
  default: {
    post: jest.fn(), get: jest.fn(), delete: jest.fn(), patch: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../store/auth/authContext";
import { DashboardProvider } from "../store/dashboard/dashboardContext";
import AssistantChat from "../components/AI/AssistantChat";
import API from "../services/axiosConfig";

const AUTH_USER = { token: "t", user: { _id: "u1", username: "g", email: "g@t.com", steamId: null, role: "user" } };

const wrap = (isOpen = true, onClose = jest.fn()) => {
  localStorage.setItem("authUser", JSON.stringify(AUTH_USER));
  return render(
    <BrowserRouter><AuthProvider><DashboardProvider>
      <AssistantChat isOpen={isOpen} onClose={onClose} />
    </DashboardProvider></AuthProvider></BrowserRouter>
  );
};

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });

describe("AI Assistant UI Test", () => {

  test("does not render when isOpen is false", () => {
    wrap(false);
    expect(screen.queryByText("Gaming Assistant")).not.toBeInTheDocument();
  });

  test("renders chat panel when isOpen is true", () => {
    wrap();
    expect(screen.getByText("Gaming Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask about your games/i)).toBeInTheDocument();
  });

  test("shows welcome prompt when no messages", () => {
    wrap();
    expect(screen.getByText(/ask me anything about your games/i)).toBeInTheDocument();
  });

  test("shows close button and calls onClose when clicked", () => {
    const onClose = jest.fn();
    wrap(true, onClose);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("sends message and displays user bubble", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, response: "Here are my tips.", role: "assistant" } });
    wrap();
    await userEvent.type(screen.getByPlaceholderText(/ask about your games/i), "Give me Dota 2 tips");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText("Give me Dota 2 tips")).toBeInTheDocument());
  });

  test("shows assistant response bubble after send", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, response: "Focus on last hitting.", role: "assistant" } });
    wrap();
    await userEvent.type(screen.getByPlaceholderText(/ask about your games/i), "How do I get better at Dota 2?");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText("Focus on last hitting.")).toBeInTheDocument());
  });

  test("shows typing indicator while waiting for response", async () => {
    API.post.mockImplementation(() => new Promise(() => {}));
    wrap();
    await userEvent.type(screen.getByPlaceholderText(/ask about your games/i), "Question here");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(document.querySelectorAll("[style*='bounce']").length).toBeGreaterThan(0));
  });

  test("clears input after message is sent", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, response: "Response.", role: "assistant" } });
    wrap();
    const input = screen.getByPlaceholderText(/ask about your games/i);
    await userEvent.type(input, "My question");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(input.value).toBe(""));
  });

  test("shows rate limit error message on 429 response", async () => {
    API.post.mockRejectedValueOnce({ response: { status: 429, data: { message: "Rate limit exceeded" } } });
    wrap();
    await userEvent.type(screen.getByPlaceholderText(/ask about your games/i), "Question");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/hourly message limit/i)).toBeInTheDocument());
  });

  test("shows fallback message bubble when API fails with non-429 error", async () => {
    API.post.mockRejectedValueOnce({ response: { status: 503, data: { message: "AI temporarily unavailable." } } });
    wrap();
    await userEvent.type(screen.getByPlaceholderText(/ask about your games/i), "Question");
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    await waitFor(() => expect(screen.getByText(/trouble responding/i)).toBeInTheDocument());
  });

  test("send button is disabled when input is empty", () => {
    wrap();
    const sendBtn = screen.getByRole("button", { name: /send message/i });
    expect(sendBtn).toBeDisabled();
  });

  test("Enter key sends message", async () => {
    API.post.mockResolvedValueOnce({ data: { success: true, response: "Response.", role: "assistant" } });
    wrap();
    const input = screen.getByPlaceholderText(/ask about your games/i);
    await userEvent.type(input, "Question via enter{enter}");
    await waitFor(() => expect(API.post).toHaveBeenCalled());
  });
});
