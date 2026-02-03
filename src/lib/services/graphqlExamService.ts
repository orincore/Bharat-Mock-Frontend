import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/graphql/client';

interface GraphQLExamOption {
  id: string;
  option_text: string;
  option_text_hi?: string | null;
  is_correct: boolean;
  option_order: number;
  image_url?: string | null;
}

interface GraphQLExamQuestion {
  id: string;
  type: string;
  text: string;
  text_hi?: string | null;
  marks: number;
  negative_marks: number;
  explanation?: string | null;
  explanation_hi?: string | null;
  difficulty: string;
  image_url?: string | null;
  question_order?: number | null;
  question_number?: number | null;
  options: GraphQLExamOption[];
}

export interface GraphQLExamSection {
  id: string;
  name: string;
  name_hi?: string | null;
  total_questions: number;
  marks_per_question: number;
  duration?: number | null;
  section_order: number;
  questions: GraphQLExamQuestion[];
}

export interface GraphQLExamSummary {
  id: string;
  title: string;
  description?: string;
  duration: number;
  total_questions: number;
  total_marks: number;
  category?: string;
  category_id?: string;
  subcategory?: string;
  subcategory_id?: string;
  difficulty?: string;
  difficulty_id?: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  pass_percentage: number;
  is_free: boolean;
  price: number;
  negative_marking: boolean;
  negative_mark_value: number;
  is_published: boolean;
  allow_anytime: boolean;
  exam_type: string;
  show_in_mock_tests: boolean;
  supports_hindi?: boolean;
  slug?: string;
  url_path?: string;
  syllabus?: string[];
  logo_url?: string | null;
  thumbnail_url?: string | null;
}

interface AdminExamDetailData {
  adminExam: GraphQLExamSummary;
  examStructure: GraphQLExamSection[];
}

interface UpdateExamResponse {
  updateExam: {
    exam: {
      id: string;
      title: string;
      updated_at: string;
    };
  };
}

interface CreateExamResponse {
  createExam: {
    exam: {
      id: string;
      title: string;
    };
  };
}

interface DraftFieldsResponse {
  draftFields: DraftFieldPayload[];
}

const ADMIN_EXAM_DETAIL = gql`
  query AdminExamDetail($id: ID!) {
    adminExam(id: $id) {
      id
      title
      description
      duration
      total_questions
      total_marks
      category
      category_id
      subcategory
      subcategory_id
      difficulty
      difficulty_id
      status
      start_date
      end_date
      pass_percentage
      is_free
      price
      negative_marking
      negative_mark_value
      is_published
      allow_anytime
      exam_type
      show_in_mock_tests
      supports_hindi
      slug
      url_path
      syllabus
      logo_url
      thumbnail_url
    }
    examStructure(examId: $id) {
      id
      name
      name_hi
      total_questions
      marks_per_question
      duration
      section_order
      questions {
        id
        type
        text
        text_hi
        marks
        negative_marks
        explanation
        explanation_hi
        difficulty
        image_url
        question_order
        question_number
        options {
          id
          option_text
          option_text_hi
          is_correct
          option_order
          image_url
        }
      }
    }
  }
`;

const UPSERT_DRAFT_FIELD = gql`
  mutation UpsertDraftField($input: DraftFieldInput!) {
    upsertDraftField(input: $input) {
      id
      field_path
      payload
      updated_at
    }
  }
`;

const CLEAR_DRAFT = gql`
  mutation ClearDraft($draft_key: String!, $exam_id: ID) {
    clearDraft(draft_key: $draft_key, exam_id: $exam_id)
  }
`;

const DRAFT_FIELDS_QUERY = gql`
  query DraftFields($draft_key: String!, $exam_id: ID) {
    draftFields(draft_key: $draft_key, exam_id: $exam_id) {
      id
      field_path
      payload
      updated_at
    }
  }
`;

const UPLOAD_QUESTION_IMAGE = gql`
  mutation UploadQuestionImage($questionId: ID!, $file: String!) {
    uploadQuestionImage(questionId: $questionId, file: $file) {
      success
      imageUrl
    }
  }
`;

const UPLOAD_OPTION_IMAGE = gql`
  mutation UploadOptionImage($optionId: ID!, $file: String!) {
    uploadOptionImage(optionId: $optionId, file: $file) {
      success
      imageUrl
    }
  }
`;

const UPDATE_EXAM_MUTATION = gql`
  mutation UpdateExam(
    $id: ID!
    $input: ExamInput!
    $sections: [SectionInput!]
  ) {
    updateExam(
      id: $id
      input: $input
      sections: $sections
    ) {
      exam {
        id
        title
        updated_at
      }
    }
  }
`;

const CREATE_EXAM_MUTATION = gql`
  mutation CreateExam(
    $input: ExamInput!
    $sections: [SectionInput!]
  ) {
    createExam(input: $input, sections: $sections) {
      exam {
        id
        title
      }
    }
  }
`;

export interface DraftFieldPayload {
  id: string;
  field_path: string;
  payload: any;
  updated_at: string;
}

export const graphqlExamService = {
  async fetchExamDetail(id: string) {
    const { data } = await apolloClient.query<AdminExamDetailData>({
      query: ADMIN_EXAM_DETAIL,
      variables: { id },
      fetchPolicy: 'network-only'
    });
    return {
      exam: data?.adminExam,
      sections: data?.examStructure ?? []
    };
  },

  async updateExam(params: {
    id: string;
    input: any;
    sections?: any[];
    logo?: File | null;
    thumbnail?: File | null;
  }) {
    const { id, input, sections = [] } = params;
    return apolloClient.mutate<UpdateExamResponse>({
      mutation: UPDATE_EXAM_MUTATION,
      variables: {
        id,
        input,
        sections
      }
    });
  },

  async createExam(params: {
    input: any;
    sections?: any[];
    logo?: File | null;
    thumbnail?: File | null;
  }) {
    const { input, sections = [] } = params;
    const { data } = await apolloClient.mutate<CreateExamResponse>({
      mutation: CREATE_EXAM_MUTATION,
      variables: {
        input,
        sections
      }
    });
    return data?.createExam?.exam;
  },

  async upsertDraftField(payload: { draft_key: string; exam_id?: string | null; field_path: string; data: any }) {
    return apolloClient.mutate({
      mutation: UPSERT_DRAFT_FIELD,
      variables: {
        input: {
          draft_key: payload.draft_key,
          exam_id: payload.exam_id ?? null,
          field_path: payload.field_path,
          payload: payload.data
        }
      }
    });
  },

  async clearDraft(draft_key: string, exam_id?: string | null) {
    return apolloClient.mutate({
      mutation: CLEAR_DRAFT,
      variables: { draft_key, exam_id: exam_id ?? null }
    });
  },

  async fetchDraftFields(draft_key: string, exam_id?: string | null): Promise<DraftFieldPayload[]> {
    const { data } = await apolloClient.query<DraftFieldsResponse>({
      query: DRAFT_FIELDS_QUERY,
      variables: { draft_key, exam_id: exam_id ?? null },
      fetchPolicy: 'network-only'
    });
    return data?.draftFields ?? [];
  },

  async uploadQuestionImage(questionId: string, file: File): Promise<string | null> {
    try {
      // Convert file to base64 for GraphQL transmission
      const base64 = await this.fileToBase64(file);
      const { data } = await apolloClient.mutate<{ uploadQuestionImage: { success: boolean; imageUrl?: string } }>({
        mutation: UPLOAD_QUESTION_IMAGE,
        variables: {
          questionId,
          file: base64
        }
      });
      return data?.uploadQuestionImage?.imageUrl || null;
    } catch (error) {
      console.error('Question image upload failed:', error);
      return null;
    }
  },

  async uploadOptionImage(optionId: string, file: File): Promise<string | null> {
    try {
      // Convert file to base64 for GraphQL transmission
      const base64 = await this.fileToBase64(file);
      const { data } = await apolloClient.mutate<{ uploadOptionImage: { success: boolean; imageUrl?: string } }>({
        mutation: UPLOAD_OPTION_IMAGE,
        variables: {
          optionId,
          file: base64
        }
      });
      return data?.uploadOptionImage?.imageUrl || null;
    } catch (error) {
      console.error('Option image upload failed:', error);
      return null;
    }
  },

  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
