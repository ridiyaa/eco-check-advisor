import { z } from "zod";

export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(["single_choice", "free_text"]),
  options: z.array(z.string()).optional().default([]),
  why_asking: z.string(),
  maps_to: z.string(),
});

export const FollowUpResponseSchema = z.object({
  user_summary: z.object({
    objectType: z.string(),
    householdSize: z.string(),
    mainConcern: z.string(),
    budgetSensitivity: z.string().optional(),
    constraints: z.array(z.string()).optional().default([]),
  }),
  eco_score_explanation: z.object({
    score: z.coerce.number(),
    drivers: z.array(
      z.object({
        driver: z.string(),
        weight: z.union([z.string(), z.number()]).transform(String),
        reason: z.string(),
      })
    ),
  }),
  follow_up_questions: z.array(FollowUpQuestionSchema).max(3).default([]),
});

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().transform((c) => c.toLowerCase()),
  priority: z.coerce.number().int().min(1).max(5),
  impact_range: z.string(),
  effort_level: z.string(),
  cost_range: z.string(),
  reasoning_bullets: z.array(z.string()).min(1).max(5),
  assumptions: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(1),
  evidence_ids: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
});

// Tolerant follow-up item: accept either a full object or a bare string
const TolerantFollowUpItem = z.union([
  FollowUpQuestionSchema,
  z.string().transform((s) => ({
    id: `auto-${Math.random().toString(36).slice(2, 8)}`,
    question: s,
    type: "free_text" as const,
    options: [],
    why_asking: "",
    maps_to: "",
  })),
]);

export const AdvisorResponseSchema = z.object({
  user_summary: z.object({
    objectType: z.string(),
    householdSize: z.string(),
    mainConcern: z.string(),
    budgetSensitivity: z.string().optional(),
    constraints: z.array(z.string()).optional().default([]),
  }),
  eco_score_explanation: z.object({
    score: z.coerce.number(),
    drivers: z.array(
      z.object({
        driver: z.string(),
        weight: z.union([z.string(), z.number()]).transform(String),
        reason: z.string(),
      })
    ).default([]),
  }),
  follow_up_questions: z.array(TolerantFollowUpItem).max(3).default([]),
  recommendations: z.array(RecommendationSchema).min(1).max(5),
  action_plan: z.object({
    steps: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        timeframe: z.string(),
      })
    ).default([]),
    quick_wins: z.array(z.string()).default([]),
    longer_term: z.array(z.string()).default([]),
  }),
  safety_notes: z.array(z.string()).default([]),
  disclaimer: z.string(),
});

export type FollowUpQuestion = z.infer<typeof FollowUpQuestionSchema>;
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;
export type AdvisorResponse = z.infer<typeof AdvisorResponseSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
