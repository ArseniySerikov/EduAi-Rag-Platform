import api from "./client";
import type { Message } from "../types";

export const getMessages = (chatId: number) =>
  api.get<Message[]>(`/messages/${chatId}`).then((r) => r.data);

export const sendMessage = (chatId: number, content: string) =>
  api.post<Message>(`/messages/${chatId}`, { content }).then((r) => r.data);

export const sendVoice = (chatId: number, audioBlob: Blob, filename: string) => {
  const formData = new FormData();
  formData.append("audio", audioBlob, filename);
  return api
    .post<{ text: string }>(`/messages/${chatId}/voice`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
