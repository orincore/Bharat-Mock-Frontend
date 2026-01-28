const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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

  async updateSubcategory(id: string, payload: {
    name: string;
    slug?: string;
    description?: string;
    display_order?: string | number | null;
    is_active?: boolean;
  }) {
    return authFetch(`/taxonomy/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
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
  }
};
