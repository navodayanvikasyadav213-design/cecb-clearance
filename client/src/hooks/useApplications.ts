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

export function useAllApplications() {
  return useQuery({
    queryKey: ["applications", "all"],
    queryFn:  async () => {
      const res = await api.get("/api/admin/applications");
      return res.data.data;
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/submit`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useStartScrutiny() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/scrutiny`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useIssueEds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deficiencies }: { id: string; deficiencies: string }) =>
      api.post(`/api/applications/${id}/eds`, { deficiencies }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useReferApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/refer`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useTriggerGist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/gist/generate`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useUpdateGist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gistText }: { id: string; gistText: string }) =>
      api.patch(`/api/applications/${id}/gist`, { gistText }),
    onSuccess:  (_, vars) => queryClient.invalidateQueries({ queryKey: ["applications", vars.id] }),
  });
}

export function useFinalizeMom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/applications/${id}/mom/lock`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ docId, verified }: { docId: string; verified: boolean }) =>
      api.patch(`/api/applications/documents/${docId}/verify`, { verified }),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}