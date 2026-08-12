/**
 * match_resume_to_jd tool (fast path)
 *
 * Runs: parse JD + parse resume (parallel) → gap analysis → aggregate.
 * Skips rewrite suggestions and cover letter for speed.
 *
 * Typical latency: 4-10s depending on API cold start.
 */

import { parseJd } from "../lib/agents/jd-parser.js";
import { parseResume } from "../lib/agents/resume-parser.js";
import { analyzeGaps } from "../lib/agents/gap-analyzer.js";
import { aggregateScores } from "../lib/agents/aggregator.js";
import type { GapItem } from "../types/index.js";

export async function matchResumeToJd(jdText: string, resumeText: string) {
  if (!jdText?.trim()) {
    throw new Error("Job description text cannot be empty");
  }
  if (!resumeText?.trim()) {
    throw new Error("Resume text cannot be empty");
  }

  const t0 = Date.now();

  // Stage 1: Parse JD and Resume in parallel
  const [jd, resume] = await Promise.all([parseJd(jdText), parseResume(resumeText)]);
  const parseTime = ((Date.now() - t0) / 1000).toFixed(1);

  // Stage 2: Gap analysis
  const t1 = Date.now();
  const gapAnalysis = await analyzeGaps(jd, resume);
  const gapTime = ((Date.now() - t1) / 1000).toFixed(1);

  // Stage 3: Aggregate scores
  const aggregated = aggregateScores(gapAnalysis);
  const totalTime = ((Date.now() - t0) / 1000).toFixed(1);

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
    gap_analysis: {
      overall_match: gapAnalysis.overall_match,
      matched: gapAnalysis.matched_count,
      partial: gapAnalysis.partial_count,
      missing: gapAnalysis.missing_count,
      total: gapAnalysis.total_requirements,
      gaps: gapAnalysis.gaps.map((g: GapItem) => ({
        requirement: g.requirement,
        status: g.status,
        score: g.similarity_score,
        evidence: g.matched_evidence,
        category: g.category,
      })),
    },
    jd_parsed: {
      title: jd.title,
      company: jd.company,
      seniority: jd.seniority_level,
      hard_skills_count: jd.hard_skills.length,
      soft_skills_count: jd.soft_skills.length,
    },
    resume_parsed: {
      name: resume.name,
      skills_count: resume.skills.length,
      experience_count: resume.experience.length,
    },
    timings: {
      parse: `${parseTime}s`,
      gap_analysis: `${gapTime}s`,
      aggregate: "0.0s",
      total: `${totalTime}s`,
    },
  };
}
