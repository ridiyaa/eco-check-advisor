import { z } from "zod";

export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["single_choice", "free_text"]),
  options: z.array(z.string()).optional(),
  why_asking: z.string(),
  maps_to: z.string(),
});

export const FollowUpResponseSchema = z.object({
  user_summary: z.object({
    objectType: z.string(),
    householdSize: z.string(),
    mainConcern: z.string(),
    budgetSensitivity: z.string().optional(),
    constraints: z.array(z.string()).optional(),
  }),
  eco_score_explanation: z.object({
    score: z.number(),
    drivers: z.array(
      z.object({
        driver: z.string(),
        weight: z.string(),
        reason: z.string(),
      })
    ),
  }),
  follow_up_questions: z.array(FollowUpQuestionSchema).max(3),
});

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  priority: z.number().min(1).max(5),
  impact_range: z.string(),
  effort_level: z.string(),
  cost_range: z.string(),
  reasoning_bullets: z.array(z.string()).min(1).max(5),
  assumptions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  evidence_ids: z.array(z.string()),
  products: z.array(z.string()),
});

export const AdvisorResponseSchema = z.object({
  user_summary: z.object({
    objectType: z.string(),
    householdSize: z.string(),
    mainConcern: z.string(),
    budgetSensitivity: z.string().optional(),
    constraints: z.array(z.string()).optional(),
  }),
  eco_score_explanation: z.object({
    score: z.number(),
    drivers: z.array(
      z.object({
        driver: z.string(),
        weight: z.string(),
        reason: z.string(),
      })
    ),
  }),
  follow_up_questions: z.array(FollowUpQuestionSchema).max(3).default([]),
  recommendations: z.array(RecommendationSchema).min(1).max(5),
  action_plan: z.object({
    steps: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        timeframe: z.string(),
      })
    ),
    quick_wins: z.array(z.string()),
    longer_term: z.array(z.string()),
  }),
  safety_notes: z.array(z.string()),
  disclaimer: z.string(),
});

export type FollowUpQuestion = z.infer<typeof FollowUpQuestionSchema>;
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;
export type AdvisorResponse = z.infer<typeof AdvisorResponseSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
