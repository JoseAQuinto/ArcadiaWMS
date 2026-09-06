import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "@/services/users.api";
import { changePassword } from "@/services/auth.api";

export function useUsers(params: usersApi.UserListParams) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: () => usersApi.fetchUsers(params),
    placeholderData: (previous) => previous,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: usersApi.UpdateUserInput }) => usersApi.updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

/** Self-service, so it is not scoped to the admin-only users list and invalidates nothing. */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}
