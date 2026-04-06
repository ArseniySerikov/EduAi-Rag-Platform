import api from "./client";
import type { NewsItem } from "../types";

export const listNews = () => api.get<NewsItem[]>("/news").then((r) => r.data);

export const createNews = (data: { title: string; content: string; is_published: boolean }) =>
  api.post<NewsItem>("/news", data).then((r) => r.data);

export const updateNews = (
  id: number,
  data: Partial<{ title: string; content: string; is_published: boolean }>
) => api.patch<NewsItem>(`/news/${id}`, data).then((r) => r.data);

export const deleteNews = (id: number) => api.delete(`/news/${id}`);
