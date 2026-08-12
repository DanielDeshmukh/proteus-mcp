/**
 * extract_jd_requirements tool
 * Wraps parseJd() from the PROTEUS pipeline.
 */

import { parseJd } from "../../../proteus/proteus-next/src/lib/agents/jd-parser.js";

export async function extractJdRequirements(jdText: string) {
  if (!jdText?.trim()) {
    throw new Error("Job description text cannot be empty");
  }
  return parseJd(jdText);
}
