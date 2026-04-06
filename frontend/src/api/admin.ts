import api from "./client";
import type { User, Chat, AdminStats } from "../types";

export const getStats = () => api.get<AdminStats>("/admin/stats").then((r) => r.data);
export const listUsers = () => api.get<User[]>("/admin/users").then((r) => r.data);
export const toggleUserActive = (id: number) =>
  api.patch<User>(`/admin/users/${id}/toggle-active`).then((r) => r.data);
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}`);
export const getUserChats = (userId: number) =>
  api.get<Chat[]>(`/admin/users/${userId}/chats`).then((r) => r.data);
