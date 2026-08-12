/**
 * generate_gap_report tool
 * Wraps analyzeGaps() from the PROTEUS pipeline.
 * Returns the full gap analysis with matched, partial, and missing requirements.
 */

import { analyzeGaps } from "../../../proteus/proteus-next/src/lib/agents/gap-analyzer.js";
import type { JDStructured, ResumeStructured } from "../../../proteus/proteus-next/src/types/index.js";

export async function generateGapReport(jd: JDStructured, resume: ResumeStructured) {
  const gapAnalysis = await analyzeGaps(jd, resume);

  const matched = gapAnalysis.gaps
    .filter((g) => g.status === "matched")
    .map((g) => ({
      requirement: g.requirement,
      score: g.similarity_score,
      evidence: g.matched_evidence,
      category: g.category,
    }));

  const partial = gapAnalysis.gaps
    .filter((g) => g.status === "partial")
    .map((g) => ({
      requirement: g.requirement,
      score: g.similarity_score,
      evidence: g.matched_evidence,
      category: g.category,
    }));

  const missing = gapAnalysis.gaps
    .filter((g) => g.status === "missing")
    .map((g) => ({
      requirement: g.requirement,
      score: g.similarity_score,
      category: g.category,
    }));

  return {
    overall_match: gapAnalysis.overall_match,
    summary: {
      matched: gapAnalysis.matched_count,
      partial: gapAnalysis.partial_count,
      missing: gapAnalysis.missing_count,
      total: gapAnalysis.total_requirements,
    },
    matched_skills: matched,
    partial_matches: partial,
    missing_skills: missing,
  };
}
