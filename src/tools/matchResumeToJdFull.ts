/**
 * match_resume_to_jd_full tool
 *
 * Runs the complete PROTEUS pipeline including rewrite suggestions and cover letter.
 * Includes everything from match_resume_to_jd plus actionable rewrites and a cover letter.
 *
 * Worst-case latency: ~90s (rewrite + cover letter generation are LLM calls).
 * Document this clearly so calling models set expectations correctly.
 */

import { parseJd } from "../lib/agents/jd-parser.js";
import { parseResume } from "../lib/agents/resume-parser.js";
import { analyzeGaps } from "../lib/agents/gap-analyzer.js";
import { suggestRewrites } from "../lib/agents/rewrite-suggester.js";
import { generateCoverLetter } from "../lib/agents/cover-letter.js";
import { aggregateScores } from "../lib/agents/aggregator.js";
import type { Tone, GapItem, RewriteSuggestion, CoverLetterSection } from "../types/index.js";

export async function matchResumeToJdFull(
  jdText: string,
  resumeText: string,
  coverLetterTone: Tone = "professional"
) {
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

  // Stage 3: Rewrites and cover letter in parallel
  const t2 = Date.now();
  const [rewrites, coverLetter] = await Promise.all([
    suggestRewrites(jd, resume, gapAnalysis),
    generateCoverLetter(jd, resume, gapAnalysis, coverLetterTone),
  ]);
  const generateTime = ((Date.now() - t2) / 1000).toFixed(1);

  // Stage 4: Aggregate scores
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
    rewrite_suggestions: {
      suggestions: rewrites.suggestions.map((s: RewriteSuggestion) => ({
        original: s.original_bullet,
        rewrite: s.suggested_rewrite,
        rationale: s.rationale,
        target: s.target_requirement,
        impact: s.impact_score,
      })),
      hidden_experience: rewrites.hidden_experience,
    },
    cover_letter: {
      job_title: coverLetter.job_title,
      full_letter: coverLetter.full_letter,
      tone: coverLetter.tone,
      word_count: coverLetter.word_count,
      key_points_addressed: coverLetter.key_points_addressed,
      sections: coverLetter.sections.map((s: CoverLetterSection) => ({
        heading: s.heading,
        content: s.content,
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
      generate: `${generateTime}s`,
      aggregate: "0.0s",
      total: `${totalTime}s`,
    },
  };
}
