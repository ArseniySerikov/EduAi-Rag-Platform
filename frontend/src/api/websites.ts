import api from "./client";
import type { WebsiteSource } from "../types";

export const listWebsites = () =>
  api.get<WebsiteSource[]>("/websites").then((r) => r.data);

export const createWebsite = (payload: {
  url: string;
  title?: string;
  should_parse?: boolean;
  is_enabled?: boolean;
}) => api.post<WebsiteSource>("/websites", payload).then((r) => r.data);

export const updateWebsite = (
  id: number,
  payload: { title?: string; should_parse?: boolean; is_enabled?: boolean }
) => api.patch<WebsiteSource>(`/websites/${id}`, payload).then((r) => r.data);

export const parseWebsite = (id: number) =>
  api.post<WebsiteSource>(`/websites/${id}/parse`).then((r) => r.data);

export const parseAllWebsites = () => api.post("/websites/parse-all").then((r) => r.data);

export const clearRag = () => api.post("/websites/clear-rag");

export const deleteWebsite = (id: number) => api.delete(`/websites/${id}`);
