export const getRoleHomePath = (role: string | null): string => {
  switch (role) {
    case "admin":
      return "/admin?tab=overview";
    case "user":
      return "/user/create-errand";
    case "rider":
      return "/rider";
    default:
      return "/";
  }
};
