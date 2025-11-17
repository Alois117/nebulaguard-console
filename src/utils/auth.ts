export type UserRole = 'user' | 'org_admin' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export const getAuthUser = (): AuthUser | null => {
  const authData = localStorage.getItem("nebula_auth");
  const roleData = localStorage.getItem("nebula_role");
  const userEmail = localStorage.getItem("nebula_email");
  const userId = localStorage.getItem("nebula_user_id");
  
  if (authData === "true" && roleData && userEmail && userId) {
    return {
      id: userId,
      email: userEmail,
      role: roleData as UserRole,
      organizationId: localStorage.getItem("nebula_org_id") || undefined
    };
  }
  
  return null;
};

export const setAuthUser = (user: AuthUser) => {
  localStorage.setItem("nebula_auth", "true");
  localStorage.setItem("nebula_role", user.role);
  localStorage.setItem("nebula_email", user.email);
  localStorage.setItem("nebula_user_id", user.id);
  if (user.organizationId) {
    localStorage.setItem("nebula_org_id", user.organizationId);
  }
};

export const clearAuth = () => {
  localStorage.removeItem("nebula_auth");
  localStorage.removeItem("nebula_role");
  localStorage.removeItem("nebula_email");
  localStorage.removeItem("nebula_user_id");
  localStorage.removeItem("nebula_org_id");
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem("nebula_auth") === "true";
};
