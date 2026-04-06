import api from "./client";
import type { Chat } from "../types";

export const listChats = () => api.get<Chat[]>("/chats").then((r) => r.data);
export const createChat = (title?: string) =>
  api.post<Chat>("/chats", { title: title || "Новый чат" }).then((r) => r.data);
export const updateChat = (id: number, title: string) =>
  api.patch<Chat>(`/chats/${id}`, { title }).then((r) => r.data);
export const deleteChat = (id: number) => api.delete(`/chats/${id}`);
