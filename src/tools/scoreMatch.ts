/**
 * score_match tool
 * Wraps analyzeGaps() + aggregateScores() from the PROTEUS pipeline.
 *
 * Aggregation (aggregateScores) is deterministic — pure math, no LLM.
 * Gap analysis (analyzeGaps) uses embeddings — deterministic (no temperature)
 * but depends on model availability.
 */

import { analyzeGaps } from "../lib/agents/gap-analyzer.js";
import { aggregateScores } from "../lib/agents/aggregator.js";
import type { JDStructured, ResumeStructured } from "../types/index.js";

export async function scoreMatch(jd: JDStructured, resume: ResumeStructured) {
  const gapAnalysis = await analyzeGaps(jd, resume);
  const aggregated = aggregateScores(gapAnalysis);

  return {
    overall_score: aggregated.overall_score,
    section_scores: aggregated.section_scores,
    summary: aggregated.summary,
    weighting_used: {
      hard_skills: 0.5,
      domain_keywords: 0.2,
      soft_skills: 0.15,
      ats_bait: 0.15,
    },
    gap_summary: {
      matched: gapAnalysis.matched_count,
      partial: gapAnalysis.partial_count,
      missing: gapAnalysis.missing_count,
      total: gapAnalysis.total_requirements,
    },
  };
}
