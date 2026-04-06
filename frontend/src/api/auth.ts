import api from "./client";
import type { TokenOut, User } from "../types";

export const register = (data: { email: string; username: string; password: string }) =>
  api.post<TokenOut>("/auth/register", data).then((r) => r.data);

export const login = (data: { email: string; password: string }) =>
  api.post<TokenOut>("/auth/login", data).then((r) => r.data);

export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);
