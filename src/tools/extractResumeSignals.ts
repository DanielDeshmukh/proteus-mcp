/**
 * extract_resume_signals tool
 * Wraps parseResume() from the PROTEUS pipeline.
 */

import { parseResume } from "../../../proteus/proteus-next/src/lib/agents/resume-parser.js";

export async function extractResumeSignals(resumeText: string) {
  if (!resumeText?.trim()) {
    throw new Error("Resume text cannot be empty");
  }
  return parseResume(resumeText);
}
