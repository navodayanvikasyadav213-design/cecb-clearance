import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../config/api";

export function useApplications() {
  return useQuery({
    queryKey: ["applications"],
    queryFn:  async () => {
      const res = await api.get("/api/applications");
      return res.data.data.applications;
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: ["applications", id],
    queryFn:  async () => {
      const res = await api.get(`/api/applications/${id}`);
      return res.data.data.application;
    },
    enabled: !!id,
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/submit`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}