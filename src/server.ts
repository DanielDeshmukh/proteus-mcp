#!/usr/bin/env node
/**
 * PROTEUS MCP Server
 *
 * Wraps the PROTEUS resume-matching pipeline as MCP tools.
 * Transport: stdio (works with Claude Desktop / Claude Code / OpenCode).
 *
 * Tools:
 *   - extract_jd_requirements: Parse a JD into structured requirements
 *   - extract_resume_signals: Parse a resume into structured signals
 *   - score_match: Score a parsed JD against parsed resume (deterministic)
 *   - generate_gap_report: Generate gap analysis from parsed JD + resume
 *   - match_resume_to_jd: Fast path — parse, gap, aggregate (skips rewrites/cover letter)
 *   - match_resume_to_jd_full: Full pipeline incl. rewrites + cover letter (~90s worst case)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { extractJdRequirements } from "./tools/extractJdRequirements.js";
import { extractResumeSignals } from "./tools/extractResumeSignals.js";
import { scoreMatch } from "./tools/scoreMatch.js";
import { generateGapReport } from "./tools/generateGapReport.js";
import { matchResumeToJd } from "./tools/matchResumeToJd.js";
import { matchResumeToJdFull } from "./tools/matchResumeToJdFull.js";

const server = new McpServer({
  name: "proteus",
  version: "1.0.0",
});

// ── Tool 1: extract_jd_requirements ──────────────────────────

server.tool(
  "extract_jd_requirements",
  "Parse a raw job description into structured requirements (skills, seniority, keywords). Use when you need to understand what a JD is asking for.",
  { jd_text: z.string().describe("The full job description text") },
  async ({ jd_text }) => {
    const result = await extractJdRequirements(jd_text);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 2: extract_resume_signals ───────────────────────────

server.tool(
  "extract_resume_signals",
  "Parse a raw resume into structured candidate data (skills, experience, education). Use when you need to understand what a candidate offers.",
  { resume_text: z.string().describe("The full resume text") },
  async ({ resume_text }) => {
    const result = await extractResumeSignals(resume_text);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 3: score_match ──────────────────────────────────────

server.tool(
  "score_match",
  "Score how well a parsed JD matches a parsed resume. Returns overall score and category breakdown. Aggregation is deterministic; gap analysis uses embeddings.",
  {
    jd_requirements: z.object({}).describe("Structured JD output from extract_jd_requirements"),
    resume_signals: z.object({}).describe("Structured resume output from extract_resume_signals"),
  },
  async ({ jd_requirements, resume_signals }) => {
    const result = await scoreMatch(jd_requirements as any, resume_signals as any);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 4: generate_gap_report ──────────────────────────────

server.tool(
  "generate_gap_report",
  "Generate a detailed gap analysis showing matched, partial, and missing requirements between a JD and resume.",
  {
    jd_requirements: z.object({}).describe("Structured JD output from extract_jd_requirements"),
    resume_signals: z.object({}).describe("Structured resume output from extract_resume_signals"),
  },
  async ({ jd_requirements, resume_signals }) => {
    const result = await generateGapReport(jd_requirements as any, resume_signals as any);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 5: match_resume_to_jd (fast path) ───────────────────

server.tool(
  "match_resume_to_jd",
  "Fast path: match a resume against a JD. Returns overall score, category breakdown, and gap report. Skips rewrite suggestions and cover letter for speed (~4-10s).",
  {
    jd_text: z.string().describe("The full job description text"),
    resume_text: z.string().describe("The full resume text"),
  },
  async ({ jd_text, resume_text }) => {
    const result = await matchResumeToJd(jd_text, resume_text);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Tool 6: match_resume_to_jd_full ──────────────────────────

server.tool(
  "match_resume_to_jd_full",
  "Full pipeline: match resume to JD including rewrite suggestions and tailored cover letter. Includes everything from match_resume_to_jd plus actionable rewrites and a cover letter. Worst-case ~90s due to LLM generation.",
  {
    jd_text: z.string().describe("The full job description text"),
    resume_text: z.string().describe("The full resume text"),
    cover_letter_tone: z.enum(["professional", "enthusiastic", "concise"]).optional().default("professional").describe("Cover letter tone"),
  },
  async ({ jd_text, resume_text, cover_letter_tone }) => {
    const result = await matchResumeToJdFull(jd_text, resume_text, cover_letter_tone);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Start server ─────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PROTEUS MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
