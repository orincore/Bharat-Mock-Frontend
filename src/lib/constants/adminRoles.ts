export type AdminRole = 'admin' | 'editor' | 'author' | 'user';

export interface RolePermissions {
  canAccessExams: boolean;
  canAccessCategories: boolean;
  canAccessSubcategories: boolean;
  canAccessBlogs: boolean;
  canAccessUsers: boolean;
  canAccessHomepage: boolean;
  canAccessPages: boolean;
  canAccessSubscriptions: boolean;
  canAccessNavigation: boolean;
  canAccessFooter: boolean;
  canAccessAbout: boolean;
  canAccessPrivacy: boolean;
  canAccessDisclaimer: boolean;
  canAccessContact: boolean;
  canAccessTestimonials: boolean;
  canDelete: boolean;
}

export const ROLE_PERMISSIONS: Record<AdminRole, RolePermissions> = {
  admin: {
    canAccessExams: true,
    canAccessCategories: true,
    canAccessSubcategories: true,
    canAccessBlogs: true,
    canAccessUsers: true,
    canAccessHomepage: true,
    canAccessPages: true,
    canAccessSubscriptions: true,
    canAccessNavigation: true,
    canAccessFooter: true,
    canAccessAbout: true,
    canAccessPrivacy: true,
    canAccessDisclaimer: true,
    canAccessContact: true,
    canAccessTestimonials: true,
    canDelete: true,
  },
  editor: {
    canAccessExams: true,
    canAccessCategories: true,
    canAccessSubcategories: true,
    canAccessBlogs: false,
    canAccessUsers: false,
    canAccessHomepage: false,
    canAccessPages: false,
    canAccessSubscriptions: false,
    canAccessNavigation: false,
    canAccessFooter: false,
    canAccessAbout: false,
    canAccessPrivacy: false,
    canAccessDisclaimer: false,
    canAccessContact: false,
    canAccessTestimonials: false,
    canDelete: false,
  },
  author: {
    canAccessExams: false,
    canAccessCategories: false,
    canAccessSubcategories: false,
    canAccessBlogs: true,
    canAccessUsers: false,
    canAccessHomepage: false,
    canAccessPages: false,
    canAccessSubscriptions: false,
    canAccessNavigation: false,
    canAccessFooter: false,
    canAccessAbout: false,
    canAccessPrivacy: false,
    canAccessDisclaimer: false,
    canAccessContact: false,
    canAccessTestimonials: false,
    canDelete: false,
  },
  user: {
    canAccessExams: false,
    canAccessCategories: false,
    canAccessSubcategories: false,
    canAccessBlogs: false,
    canAccessUsers: false,
    canAccessHomepage: false,
    canAccessPages: false,
    canAccessSubscriptions: false,
    canAccessNavigation: false,
    canAccessFooter: false,
    canAccessAbout: false,
    canAccessPrivacy: false,
    canAccessDisclaimer: false,
    canAccessContact: false,
    canAccessTestimonials: false,
    canDelete: false,
  },
};

export const getRolePermissions = (role?: string): RolePermissions => {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return ROLE_PERMISSIONS.user;
  }
  return ROLE_PERMISSIONS[role as AdminRole];
};
