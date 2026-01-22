"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/common/LoadingStates";

interface ResultSummary {
  id: string;
  attempt_id: string;
  exam_id: string;
  score: number;
  total_marks: number;
  percentage: number;
  correct_answers: number;
  wrong_answers: number;
  unattempted: number;
  time_taken: number;
  status: "pass" | "fail";
  exam: {
    title: string;
    pass_percentage: number;
    total_questions: number;
  };
  created_at: string;
}

interface ReviewQuestion {
  id: string;
  sectionId: string;
  sectionName: string;
  type: "single" | "multiple" | "truefalse" | "numerical";
  text: string;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  imageUrl?: string;
  options: Array<{
    id: string;
    option_text: string;
    option_order: number;
  }>;
  correctAnswer: string | string[];
  userAnswer: string | string[] | null;
  isCorrect: boolean;
  marksObtained: number;
  timeTaken: number;
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params?.attemptId as string;

  const [result, setResult] = useState<ResultSummary | null>(null);
  const [reviewData, setReviewData] = useState<ReviewQuestion[]>([]);
  const [isReviewLoading, setIsReviewLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReview = async () => {
      if (!attemptId) {
        setError("Invalid attempt reference");
        setIsLoading(false);
        return;
      }

      try {
        const resultResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/results/attempt/${attemptId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!resultResponse.ok) {
          throw new Error("Failed to fetch result");
        }

        const resultJson = await resultResponse.json();
        setResult(resultJson.data);

        const reviewResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/results/${resultJson.data.id}/review`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!reviewResponse.ok) {
          throw new Error("Failed to fetch review data");
        }

        const reviewJson = await reviewResponse.json();
        setReviewData(reviewJson.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load review data");
      } finally {
        setIsLoading(false);
        setIsReviewLoading(false);
      }
    };

    fetchReview();
  }, [attemptId]);

  const reviewBySection = useMemo(() => {
    return reviewData.reduce<
      Record<string, { sectionName: string; questions: ReviewQuestion[] }>
    >((acc, question) => {
      if (!acc[question.sectionId]) {
        acc[question.sectionId] = {
          sectionName: question.sectionName,
          questions: [],
        };
      }
      acc[question.sectionId].questions.push(question);
      return acc;
    }, {});
  }, [reviewData]);

  const parseAnswerIds = (answer: string | string[] | null) => {
    if (!answer) return [];
    if (Array.isArray(answer)) return answer;
    try {
      const parsed = JSON.parse(answer);
      return Array.isArray(parsed) ? parsed : [answer];
    } catch {
      return [answer];
    }
  };

  const getOptionClass = (optionId: string, question: ReviewQuestion) => {
    const correctIds = parseAnswerIds(question.correctAnswer as any);
    const userIds = parseAnswerIds(question.userAnswer);
    const isCorrect = correctIds.includes(optionId);
    const isSelected = userIds.includes(optionId);

    if (isCorrect && isSelected) {
      return "border-green-600 bg-green-50";
    }

    if (isCorrect) {
      return "border-green-500 bg-green-50";
    }

    if (isSelected && !question.isCorrect) {
      return "border-destructive bg-destructive/5";
    }

    return "border-border";
  };

  const renderAnswerSummary = (question: ReviewQuestion) => {
    const userIds = parseAnswerIds(question.userAnswer);
    const correctIds = parseAnswerIds(question.correctAnswer as any);

    if (!userIds.length) {
      return "Not Answered";
    }

    const optionText = (ids: string[]) =>
      ids
        .map((id) => question.options.find((opt) => opt.id === id)?.option_text || id)
        .join(", ");

    return question.isCorrect
      ? `Correct (${optionText(userIds)})`
      : `Your Answer: ${optionText(userIds)} | Correct: ${optionText(correctIds)}`;
  };

  if (isLoading) {
    return <LoadingPage message="Loading question review..." />;
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center py-12">
        <div className="max-w-md text-center">
          <p className="text-lg font-semibold mb-2">Review unavailable</p>
          <p className="text-muted-foreground mb-6">{error || "Exam not found"}</p>
          <Button onClick={() => router.push(`/results/${attemptId}`)}>Back to result</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container-main max-w-6xl space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/results/${attemptId}`} className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to summary
              </Link>
              <h1 className="font-display text-3xl font-bold text-foreground mt-2">
                {result.exam.title}
              </h1>
              <p className="text-muted-foreground text-sm">
                Attempt ID: {result.attempt_id} · Score: {result.score}/{result.total_marks}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                result.status === "pass"
                  ? "bg-green-100 text-green-700"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {result.status === "pass" ? "Passed" : "Failed"}
              </span>
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-muted text-foreground">
                {Math.floor(result.time_taken / 60)}m {result.time_taken % 60}s
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold">Detailed Question Review</h2>
              <p className="text-sm text-muted-foreground">
                Compare your answers with the correct ones and see explanations per question.
              </p>
            </div>
            {isReviewLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading review
              </div>
            )}
          </div>

          {Object.keys(reviewBySection).length === 0 && !isReviewLoading ? (
            <p className="text-sm text-muted-foreground">Review data unavailable for this attempt.</p>
          ) : (
            <div className="space-y-8">
              {Object.values(reviewBySection).map((section) => (
                <div key={section.sectionName}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{section.sectionName}</h3>
                    <span className="text-sm text-muted-foreground">
                      {section.questions.length} question{section.questions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {section.questions.map((question, idx) => {
                      const statusBadge = question.userAnswer
                        ? question.isCorrect
                          ? "Correct"
                          : "Incorrect"
                        : "Skipped";
                      const statusColor = question.userAnswer
                        ? question.isCorrect
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-red-100 text-red-600 border-red-200"
                        : "bg-gray-100 text-gray-600 border-gray-200";

                      return (
                        <div key={question.id} className="border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Question {idx + 1}</p>
                              <p className="font-medium text-base">{question.text}</p>
                            </div>
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusColor}`}>
                              {statusBadge}
                            </span>
                          </div>

                          {question.imageUrl && (
                            <img
                              src={question.imageUrl}
                              alt="Question"
                              className="max-w-full h-auto rounded-lg border border-border mb-4"
                            />
                          )}

                          <div className="space-y-2 mb-3">
                            {question.options.map((option) => (
                              <div
                                key={option.id}
                                className={`border rounded-lg px-3 py-2 text-sm ${getOptionClass(option.id, question)}`}
                              >
                                <span className="font-semibold mr-2">
                                  {String.fromCharCode(65 + option.option_order - 1)}
                                </span>
                                {option.option_text}
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                            <span>{renderAnswerSummary(question)}</span>
                            <span>
                              Marks: {question.marksObtained} / {question.marks}
                              {question.negativeMarks > 0 && ` (Negative: -${question.negativeMarks})`}
                            </span>
                            <span>
                              Time Spent: {Math.floor(question.timeTaken / 60)}m {question.timeTaken % 60}s
                            </span>
                          </div>

                          {question.explanation && (
                            <details className="mt-2">
                              <summary className="text-sm font-semibold cursor-pointer">View Explanation</summary>
                              <p className="text-sm text-muted-foreground mt-2">{question.explanation}</p>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button onClick={() => router.push(`/results/${attemptId}`)} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Result Summary
          </Button>
          <Button variant="outline" onClick={() => router.push(`/exams/${result.exam_id}`)} className="flex-1">
            <Award className="h-4 w-4 mr-2" /> Retake Exam
          </Button>
          <Button variant="outline" onClick={() => router.push("/exams")} className="flex-1">
            <Clock className="h-4 w-4 mr-2" /> Explore more exams
          </Button>
        </div>
      </div>
    </div>
  );
}
