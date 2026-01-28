const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const authFetch = async (path: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const authFormFetch = async (path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    body: formData,
    headers,
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const categoryAdminService = {
  async getCategoryById(id: string) {
    const data = await authFetch(`/taxonomy/category-id/${id}`);
    return data.data;
  },

  async updateCategory(
    id: string,
    payload: {
      name: string;
      description?: string;
      slug?: string;
      display_order?: string | number;
      is_active?: boolean;
      logo?: File;
    }
  ) {
    const formData = new FormData();
    formData.append('name', payload.name);

    if (payload.description !== undefined) {
      formData.append('description', payload.description);
    }

    if (payload.slug && payload.slug.trim()) {
      formData.append('slug', payload.slug.trim());
    }

    if (payload.display_order !== undefined && payload.display_order !== null) {
      formData.append('display_order', payload.display_order.toString());
    }

    if (payload.is_active !== undefined) {
      formData.append('is_active', payload.is_active ? 'true' : 'false');
    }

    if (payload.logo) {
      formData.append('logo', payload.logo);
    }

    return authFormFetch(`/taxonomy/categories/${id}`, formData, 'PUT');
  },

  async getNotifications(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/notifications`);
    return data.data;
  },

  async createNotification(categoryId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${categoryId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateNotification(categoryId: string, notificationId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${categoryId}/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteNotification(categoryId: string, notificationId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  async getSyllabus(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/syllabus`);
    return data.data;
  },

  async upsertSyllabus(categoryId: string, payload: any, syllabusId?: string) {
    const method = syllabusId ? 'PUT' : 'POST';
    const url = syllabusId
      ? `/taxonomy/categories/${categoryId}/syllabus/${syllabusId}`
      : `/taxonomy/categories/${categoryId}/syllabus`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteSyllabus(categoryId: string, syllabusId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/syllabus/${syllabusId}`, {
      method: 'DELETE',
    });
  },

  async getCutoffs(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/cutoffs`);
    return data.data;
  },

  async upsertCutoff(categoryId: string, payload: any, cutoffId?: string) {
    const method = cutoffId ? 'PUT' : 'POST';
    const url = cutoffId
      ? `/taxonomy/categories/${categoryId}/cutoffs/${cutoffId}`
      : `/taxonomy/categories/${categoryId}/cutoffs`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteCutoff(categoryId: string, cutoffId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/cutoffs/${cutoffId}`, {
      method: 'DELETE',
    });
  },

  async getImportantDates(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/dates`);
    return data.data;
  },

  async upsertImportantDate(categoryId: string, payload: any, dateId?: string) {
    const method = dateId ? 'PUT' : 'POST';
    const url = dateId
      ? `/taxonomy/categories/${categoryId}/dates/${dateId}`
      : `/taxonomy/categories/${categoryId}/dates`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteImportantDate(categoryId: string, dateId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/dates/${dateId}`, {
      method: 'DELETE',
    });
  },

  async getPreparationTips(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/tips`);
    return data.data;
  },

  async upsertPreparationTip(categoryId: string, payload: any, tipId?: string) {
    const method = tipId ? 'PUT' : 'POST';
    const url = tipId
      ? `/taxonomy/categories/${categoryId}/tips/${tipId}`
      : `/taxonomy/categories/${categoryId}/tips`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deletePreparationTip(categoryId: string, tipId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/tips/${tipId}`, {
      method: 'DELETE',
    });
  },

  async getArticles(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/articles`);
    return data.data;
  },

  async linkArticle(categoryId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${categoryId}/articles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async unlinkArticle(categoryId: string, articleId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/articles/${articleId}`, {
      method: 'DELETE',
    });
  },

  async getCustomSections(categoryId: string) {
    const data = await authFetch(`/taxonomy/categories/${categoryId}/custom-sections`);
    return data.data;
  },

  async upsertCustomSection(categoryId: string, payload: any, sectionId?: string) {
    const method = sectionId ? 'PUT' : 'POST';
    const url = sectionId
      ? `/taxonomy/categories/${categoryId}/custom-sections/${sectionId}`
      : `/taxonomy/categories/${categoryId}/custom-sections`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomSection(categoryId: string, sectionId: string) {
    return authFetch(`/taxonomy/categories/${categoryId}/custom-sections/${sectionId}`, {
      method: 'DELETE',
    });
  },

  async getSubcategories(categoryId: string) {
    const data = await authFetch(`/taxonomy/subcategories?category_id=${categoryId}`);
    return data.data;
  },
};
