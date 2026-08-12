# PROTEUS MCP Server

MCP (Model Context Protocol) server wrapping the [PROTEUS](https://github.com/DanielDeshmukh/proteus) resume-matching pipeline. Call it from Claude Desktop, Claude Code, or OpenCode to get deterministic match scores, gap analyses, rewrite suggestions, and tailored cover letters — all from a single JD + resume pair.

## What This Is

A local-first MCP server that exposes PROTEUS's 5-agent pipeline as 6 discrete tools over stdio transport. No auth, no hosting, no UI. Paste a JD + resume, get actionable output.

| Tool | What it does | Latency |
|------|-------------|---------|
| `extract_jd_requirements` | Parse JD into structured requirements | ~3s |
| `extract_resume_signals` | Parse resume into structured candidate data | ~5s |
| `score_match` | Score parsed JD against parsed resume | ~2s |
| `generate_gap_report` | Detailed matched/partial/missing analysis | ~2s |
| `match_resume_to_jd` | **Fast path** — parse, gap, aggregate | **4-10s** |
| `match_resume_to_jd_full` | Full pipeline with rewrites + cover letter | **~90s worst case** |

## Setup

### Prerequisites

- Node.js 18+
- NVIDIA NIM API key (for JD parsing, gap analysis embeddings, rewrites)
- Groq API key (for resume parsing, cover letter generation)

### Install

```bash
cd proteus-mcp
npm install
```

### Environment Variables

```bash
export NVIDIA_NIM_API_KEY=nvapi-your-key
export GROQ_API_KEY=gsk-your-key
```

### Build

```bash
npm run build
```

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "proteus": {
      "command": "node",
      "args": ["--import", "tsx", "/path/to/proteus-mcp/src/server.ts"],
      "env": {
        "NVIDIA_NIM_API_KEY": "nvapi-your-key",
        "GROQ_API_KEY": "gsk-your-key"
      }
    }
  }
}
```

### Claude Code / OpenCode

Add to your MCP config:

```json
{
  "mcpServers": {
    "proteus": {
      "command": "node",
      "args": ["--import", "tsx", "/path/to/proteus-mcp/src/server.ts"],
      "env": {
        "NVIDIA_NIM_API_KEY": "nvapi-your-key",
        "GROQ_API_KEY": "gsk-your-key"
      }
    }
  }
}
```

## Tool Schemas

### `extract_jd_requirements`

**Input:**
```json
{
  "jd_text": "Google — Senior Software Engineer..."
}
```

**Output:**
```json
{
  "title": "Senior Software Engineer, Cloud Platform",
  "company": "Google",
  "seniority_level": "senior",
  "hard_skills": ["Go", "Python", "Kubernetes", ...],
  "soft_skills": ["leadership", "communication", ...],
  "domain_keywords": ["distributed systems", "cloud infrastructure", ...],
  "ats_bait": ["Kubernetes", "Terraform", "gRPC", ...],
  "requirements_summary": "5+ years experience in distributed systems..."
}
```

### `extract_resume_signals`

**Input:**
```json
{
  "resume_text": "Jane Smith\njane@email.com..."
}
```

**Output:**
```json
{
  "name": "Jane Smith",
  "skills": ["Python", "Go", "Kubernetes", ...],
  "experience": [...],
  "projects": [...],
  "education": [...],
  "certifications": [...]
}
```

### `match_resume_to_jd` (fast path)

**Input:**
```json
{
  "jd_text": "Google — Senior Software Engineer...",
  "resume_text": "Jane Smith\njane@email.com..."
}
```

**Output:**
```json
{
  "overall_score": 0.7966,
  "section_scores": {
    "hard_skills": 0.6571,
    "soft_skills": 1.0,
    "domain_keywords": 0.84,
    "ats_bait": 1.0
  },
  "gap_analysis": {
    "matched": 11,
    "partial": 4,
    "missing": 4,
    "total": 19,
    "gaps": [...]
  },
  "timings": {
    "parse": "4.7s",
    "gap_analysis": "1.9s",
    "aggregate": "0.0s",
    "total": "6.6s"
  }
}
```

### `match_resume_to_jd_full`

**Input:**
```json
{
  "jd_text": "Google — Senior Software Engineer...",
  "resume_text": "Jane Smith\njane@email.com...",
  "cover_letter_tone": "professional"
}
```

**Output:** Everything from `match_resume_to_jd` plus:
```json
{
  "rewrite_suggestions": {
    "suggestions": [...],
    "hidden_experience": [...]
  },
  "cover_letter": {
    "job_title": "Senior Software Engineer",
    "full_letter": "Dear Hiring Manager...",
    "tone": "professional",
    "word_count": 342
  }
}
```

## Determinism

| Component | Deterministic? | Notes |
|-----------|---------------|-------|
| `aggregateScores` | **Yes** | Pure math, no LLM, temperature N/A |
| `analyzeGaps` (embeddings) | **Yes** | No temperature parameter |
| `parseJd` | **Near-deterministic** | Temperature pinned to 0; same input → same JSON output |
| `parseResume` | **Near-deterministic** | Temperature pinned to 0; same input → same JSON output |
| `suggestRewrites` | No | Temperature 0.3, creative output |
| `generateCoverLetter` | No | Temperature 0.4, creative output |

The fast-path pipeline (`match_resume_to_jd`) is effectively deterministic — identical inputs produce identical scores and gap counts.

## Real Latency Numbers

Measured with real JD + resume pairs (Google Cloud SRE role vs. 7-year backend engineer):

| Stage | Cold Start | Warm |
|-------|-----------|------|
| Parse JD + Resume (parallel) | 4.7s | 2-3s |
| Gap Analysis | 1.9s | 1-2s |
| Aggregate | 0.0s | 0.0s |
| **Total (fast path)** | **6.6s** | **4-5s** |

## Privacy

- No resume/JD text written to disk or logs
- No auth, no multi-user, no persistence
- Local-only execution via stdio transport
- Calls pipeline functions directly, bypasses Next.js API routes and database

## Architecture

```
proteus-mcp/
├── src/
│   ├── server.ts                    # MCP server entrypoint, tool registration
│   ├── test.ts                      # End-to-end test
│   └── tools/
│       ├── extractJdRequirements.ts # wraps parseJd()
│       ├── extractResumeSignals.ts  # wraps parseResume()
│       ├── scoreMatch.ts            # wraps analyzeGaps() + aggregateScores()
│       ├── generateGapReport.ts     # wraps analyzeGaps()
│       ├── matchResumeToJd.ts       # fast path: parse -> gap -> aggregate
│       └── matchResumeToJdFull.ts   # full runPipeline()
├── models.json                      # PROTEUS model configuration
├── package.json
└── tsconfig.json
```

## Deviations from Spec

- **models.json copied** from proteus-next — the MCP server needs access to model config at runtime. In production, this should be symlinked or injected via env.
- **Temperature pinned to 0** on parseJd and parseResume (was 0.1) for provable determinism on the fast path.

## License

MIT
