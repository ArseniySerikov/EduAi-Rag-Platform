import api from "./client";
import type { Document } from "../types";

export const listDocuments = () =>
  api.get<Document[]>("/documents").then((r) => r.data);

export const uploadDocument = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post<Document>("/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deleteDocument = (id: number) => api.delete(`/documents/${id}`);
