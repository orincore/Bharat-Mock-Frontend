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

  const separator = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}${path}${separator}_t=${Date.now()}`;

  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
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

  const separator = path.includes('?') ? '&' : '?';
  const url = `${API_BASE}${path}${separator}_t=${Date.now()}`;

  const response = await fetch(url, {
    method,
    body: formData,
    headers: {
      ...headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const testSeriesAdminService = {
  async getCategoryById(id: string) {
    const data = await authFetch(`/test-series/${id}`);
    return data.data;
  },

  async createCategory(payload: {
    name: string;
    description?: string;
    slug?: string;
    display_order?: string | number;
    is_active?: boolean;
    logo?: File;
  }) {
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

    return authFormFetch('/taxonomy/categories', formData, 'POST');
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

  async deleteCategory(id: string) {
    return authFetch(`/taxonomy/categories/${id}`, {
      method: 'DELETE',
    });
  },

  async getNotifications(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/notifications`);
    return data.data;
  },

  async createNotification(testSeriesId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateNotification(testSeriesId: string, notificationId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteNotification(testSeriesId: string, notificationId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  async getSyllabus(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/syllabus`);
    return data.data;
  },

  async upsertSyllabus(testSeriesId: string, payload: any, syllabusId?: string) {
    const method = syllabusId ? 'PUT' : 'POST';
    const url = syllabusId
      ? `/taxonomy/categories/${testSeriesId}/syllabus/${syllabusId}`
      : `/taxonomy/categories/${testSeriesId}/syllabus`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteSyllabus(testSeriesId: string, syllabusId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/syllabus/${syllabusId}`, {
      method: 'DELETE',
    });
  },

  async getCutoffs(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/cutoffs`);
    return data.data;
  },

  async upsertCutoff(testSeriesId: string, payload: any, cutoffId?: string) {
    const method = cutoffId ? 'PUT' : 'POST';
    const url = cutoffId
      ? `/taxonomy/categories/${testSeriesId}/cutoffs/${cutoffId}`
      : `/taxonomy/categories/${testSeriesId}/cutoffs`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteCutoff(testSeriesId: string, cutoffId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/cutoffs/${cutoffId}`, {
      method: 'DELETE',
    });
  },

  async getImportantDates(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/dates`);
    return data.data;
  },

  async upsertImportantDate(testSeriesId: string, payload: any, dateId?: string) {
    const method = dateId ? 'PUT' : 'POST';
    const url = dateId
      ? `/taxonomy/categories/${testSeriesId}/dates/${dateId}`
      : `/taxonomy/categories/${testSeriesId}/dates`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteImportantDate(testSeriesId: string, dateId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/dates/${dateId}`, {
      method: 'DELETE',
    });
  },

  async getPreparationTips(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/tips`);
    return data.data;
  },

  async upsertPreparationTip(testSeriesId: string, payload: any, tipId?: string) {
    const method = tipId ? 'PUT' : 'POST';
    const url = tipId
      ? `/taxonomy/categories/${testSeriesId}/tips/${tipId}`
      : `/taxonomy/categories/${testSeriesId}/tips`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deletePreparationTip(testSeriesId: string, tipId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/tips/${tipId}`, {
      method: 'DELETE',
    });
  },

  async getArticles(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/articles`);
    return data.data;
  },

  async linkArticle(testSeriesId: string, payload: any) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/articles`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async unlinkArticle(testSeriesId: string, articleId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/articles/${articleId}`, {
      method: 'DELETE',
    });
  },

  async getCustomSections(testSeriesId: string) {
    const data = await authFetch(`/taxonomy/categories/${testSeriesId}/custom-sections`);
    return data.data;
  },

  async upsertCustomSection(testSeriesId: string, payload: any, sectionId?: string) {
    const method = sectionId ? 'PUT' : 'POST';
    const url = sectionId
      ? `/taxonomy/categories/${testSeriesId}/custom-sections/${sectionId}`
      : `/taxonomy/categories/${testSeriesId}/custom-sections`;
    return authFetch(url, {
      method,
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomSection(testSeriesId: string, sectionId: string) {
    return authFetch(`/taxonomy/categories/${testSeriesId}/custom-sections/${sectionId}`, {
      method: 'DELETE',
    });
  },

  async getCustomTabs(testSeriesId: string) {
    const data = await authFetch(`/test-series-page-content/${testSeriesId}/custom-tabs`);
    return data.data;
  },

  async createCustomTab(testSeriesId: string, payload: any) {
    return authFetch(`/test-series-page-content/${testSeriesId}/custom-tabs`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCustomTab(testSeriesId: string, tabId: string, payload: any) {
    return authFetch(`/test-series-page-content/${testSeriesId}/custom-tabs/${tabId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async deleteCustomTab(testSeriesId: string, tabId: string) {
    return authFetch(`/test-series-page-content/${testSeriesId}/custom-tabs/${tabId}`, {
      method: 'DELETE'
    });
  },

  async reorderCustomTabs(testSeriesId: string, orderedIds: string[]) {
    return authFetch(`/test-series-page-content/${testSeriesId}/custom-tabs/reorder`, {
      method: 'POST',
      body: JSON.stringify({ tabIds: orderedIds })
    });
  },

  async uploadPageMedia(testSeriesId: string, file: File, options?: { folder?: string; alt_text?: string; caption?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.folder) formData.append('folder', options.folder);
    if (options?.alt_text) formData.append('alt_text', options.alt_text);
    if (options?.caption) formData.append('caption', options.caption);
    
    return authFormFetch(`/test-series-page-content/${testSeriesId}/media`, formData, 'POST');
  },
};
