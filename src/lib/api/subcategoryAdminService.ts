const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');

export interface PageMediaItem {
  id: string;
  subcategory_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number | null;
  mime_type?: string | null;
  alt_text?: string | null;
  caption?: string | null;
}

const authFetch = async (path: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const authFetchForm = async (path: string, formData: FormData) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
    headers
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

export const subcategoryAdminService = {
  async getSubcategoryById(id: string) {
    const data = await authFetch(`/taxonomy/subcategory-id/${id}`);
    return data.data;
  },

  async createSubcategory(payload: {
    category_id: string;
    name: string;
    slug?: string;
    description?: string;
    display_order?: string | number | null;
    is_active?: boolean;
    logo?: File;
  }) {
    const formData = new FormData();
    formData.append('category_id', payload.category_id);
    formData.append('name', payload.name);
    if (payload.slug) formData.append('slug', payload.slug);
    if (payload.description !== undefined) formData.append('description', payload.description || '');
    if (payload.display_order !== undefined && payload.display_order !== null) {
      formData.append('display_order', payload.display_order.toString());
    }
    if (payload.is_active !== undefined) {
      formData.append('is_active', payload.is_active ? 'true' : 'false');
    }
    if (payload.logo) {
      formData.append('logo', payload.logo);
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/taxonomy/subcategories`, {
      method: 'POST',
      body: formData,
      headers
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  async updateSubcategory(id: string, payload: {
    name: string;
    slug?: string;
    description?: string;
    display_order?: string | number | null;
    is_active?: boolean;
    logo?: File;
  }) {
    const formData = new FormData();
    formData.append('name', payload.name);
    if (payload.slug) formData.append('slug', payload.slug);
    if (payload.description !== undefined) formData.append('description', payload.description || '');
    if (payload.display_order !== undefined && payload.display_order !== null) {
      formData.append('display_order', payload.display_order.toString());
    }
    if (payload.is_active !== undefined) {
      formData.append('is_active', payload.is_active ? 'true' : 'false');
    }
    if (payload.logo) {
      formData.append('logo', payload.logo);
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/taxonomy/subcategories/${id}`, {
      method: 'PUT',
      body: formData,
      headers
    });

    const data = await response.json();
    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  async deleteSubcategory(id: string) {
    return authFetch(`/taxonomy/subcategories/${id}`, {
      method: 'DELETE',
    });
  },

  async getOverview(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/overview`);
    return data.data;
  },

  async uploadHeroImage(subcategoryId: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    const data = await authFetchForm(`/subcategories/${subcategoryId}/overview/hero-image`, formData);
    return data.data;
  },

  async uploadPageMedia(
    subcategoryId: string,
    file: File,
    options?: { folder?: string; metadata?: Record<string, unknown> }
  ): Promise<PageMediaItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.folder) {
      formData.append('folder', options.folder);
    }
    if (options?.metadata) {
      formData.append('metadata', JSON.stringify(options.metadata));
    }

    return authFetchForm(`/page-content/${subcategoryId}/media`, formData);
  },

  async upsertOverview(subcategoryId: string, payload: any) {
    return authFetch(`/subcategories/${subcategoryId}/overview`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getUpdates(subcategoryId: string, params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const data = await authFetch(`/subcategories/${subcategoryId}/updates?${search.toString()}`);
    return data.data;
  },

  async upsertUpdate(subcategoryId: string, payload: any, updateId?: string) {
    const url = updateId
      ? `/subcategories/${subcategoryId}/updates/${updateId}`
      : `/subcategories/${subcategoryId}/updates`;
    return authFetch(url, {
      method: updateId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteUpdate(subcategoryId: string, updateId: string) {
    return authFetch(`/subcategories/${subcategoryId}/updates/${updateId}`, {
      method: 'DELETE'
    });
  },

  async getQuestionPapers(subcategoryId: string, params?: { page?: number; limit?: number }) {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const data = await authFetch(`/subcategories/${subcategoryId}/question-papers?${search.toString()}`);
    return data.data;
  },

  async upsertQuestionPaper(subcategoryId: string, payload: any, paperId?: string) {
    const url = paperId
      ? `/subcategories/${subcategoryId}/question-papers/${paperId}`
      : `/subcategories/${subcategoryId}/question-papers`;
    return authFetch(url, {
      method: paperId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteQuestionPaper(subcategoryId: string, paperId: string) {
    return authFetch(`/subcategories/${subcategoryId}/question-papers/${paperId}`, {
      method: 'DELETE'
    });
  },

  async getResources(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/resources`);
    return data.data;
  },

  async upsertResource(subcategoryId: string, payload: any, resourceId?: string) {
    const url = resourceId
      ? `/subcategories/${subcategoryId}/resources/${resourceId}`
      : `/subcategories/${subcategoryId}/resources`;
    return authFetch(url, {
      method: resourceId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteResource(subcategoryId: string, resourceId: string) {
    return authFetch(`/subcategories/${subcategoryId}/resources/${resourceId}`, {
      method: 'DELETE'
    });
  },

  async getFaqs(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/faqs`);
    return data.data;
  },

  async upsertFaq(subcategoryId: string, payload: any, faqId?: string) {
    const url = faqId
      ? `/subcategories/${subcategoryId}/faqs/${faqId}`
      : `/subcategories/${subcategoryId}/faqs`;
    return authFetch(url, {
      method: faqId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteFaq(subcategoryId: string, faqId: string) {
    return authFetch(`/subcategories/${subcategoryId}/faqs/${faqId}`, {
      method: 'DELETE'
    });
  },

  async searchExams(search?: string) {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '20');
    if (search) params.set('search', search);

    const data = await authFetch(`/admin/exams?${params.toString()}`);
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  async getHighlights(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/highlights`);
    return data.data;
  },

  async upsertHighlight(subcategoryId: string, payload: any, highlightId?: string) {
    const url = highlightId
      ? `/subcategories/${subcategoryId}/highlights/${highlightId}`
      : `/subcategories/${subcategoryId}/highlights`;
    return authFetch(url, {
      method: highlightId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteHighlight(subcategoryId: string, highlightId: string) {
    return authFetch(`/subcategories/${subcategoryId}/highlights/${highlightId}`, {
      method: 'DELETE'
    });
  },

  async getExamStats(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/exam-stats`);
    return data.data;
  },

  async upsertExamStat(subcategoryId: string, payload: any, statId?: string) {
    const url = statId
      ? `/subcategories/${subcategoryId}/exam-stats/${statId}`
      : `/subcategories/${subcategoryId}/exam-stats`;
    return authFetch(url, {
      method: statId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteExamStat(subcategoryId: string, statId: string) {
    return authFetch(`/subcategories/${subcategoryId}/exam-stats/${statId}`, {
      method: 'DELETE'
    });
  },

  async getSections(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/sections`);
    return data.data;
  },

  async upsertSection(subcategoryId: string, payload: any, sectionId?: string) {
    const url = sectionId
      ? `/subcategories/${subcategoryId}/sections/${sectionId}`
      : `/subcategories/${subcategoryId}/sections`;
    return authFetch(url, {
      method: sectionId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteSection(subcategoryId: string, sectionId: string) {
    return authFetch(`/subcategories/${subcategoryId}/sections/${sectionId}`, {
      method: 'DELETE'
    });
  },

  async getTables(subcategoryId: string) {
    const data = await authFetch(`/subcategories/${subcategoryId}/tables`);
    return data.data;
  },

  async upsertTable(subcategoryId: string, payload: any, tableId?: string) {
    const url = tableId
      ? `/subcategories/${subcategoryId}/tables/${tableId}`
      : `/subcategories/${subcategoryId}/tables`;
    return authFetch(url, {
      method: tableId ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteTable(subcategoryId: string, tableId: string) {
    return authFetch(`/subcategories/${subcategoryId}/tables/${tableId}`, {
      method: 'DELETE'
    });
  },

  async getCustomTabs(subcategoryId: string) {
    const data = await authFetch(`/page-content/${subcategoryId}/custom-tabs`);
    return data.data || [];
  },

  async createCustomTab(subcategoryId: string, payload: { title: string; description?: string }) {
    const data = await authFetch(`/page-content/${subcategoryId}/custom-tabs`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data.data;
  },

  async updateCustomTab(subcategoryId: string, tabId: string, payload: { title?: string; description?: string; tab_key?: string; display_order?: number }) {
    const data = await authFetch(`/page-content/${subcategoryId}/custom-tabs/${tabId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return data.data;
  },

  async deleteCustomTab(subcategoryId: string, tabId: string) {
    return authFetch(`/page-content/${subcategoryId}/custom-tabs/${tabId}`, {
      method: 'DELETE'
    });
  },

  async reorderCustomTabs(subcategoryId: string, tabIds: string[]) {
    return authFetch(`/page-content/${subcategoryId}/custom-tabs/reorder`, {
      method: 'POST',
      body: JSON.stringify({ tabIds })
    });
  }
};
