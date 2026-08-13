<p align="center">
  <h1 align="center">PROTEUS MCP Server</h1>
  <p align="center">
    <em>JD-aware resume matching as an MCP tool — deterministic scoring, gap analysis, rewrites, and cover letters from a single call.</em>
  </p>
</p>

<p align="center">
  <a href="https://github.com/DanielDeshmukh/proteus-mcp/actions/workflows/ci.yml">
    <img src="https://github.com/DanielDeshmukh/proteus-mcp/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/proteus-mcp">
    <img src="https://img.shields.io/npm/v/proteus-mcp?style=flat-square&color=cb3837" alt="npm version">
  </a>
  <a href="https://github.com/DanielDeshmukh/proteus-mcp/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/DanielDeshmukh/proteus-mcp?style=flat-square&color=blue" alt="License">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/MCP-2024--11--05-8b5cf6?style=flat-square&logo=modelcontextprotocol&logoColor=white" alt="MCP Protocol">
  <img src="https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <a href="https://github.com/DanielDeshmukh/proteus">
    <img src="https://img.shields.io/badge/PROTEUS-pipeline-76b900?style=flat-square" alt="PROTEUS Pipeline">
  </a>
  <img src="https://img.shields.io/badge/NVIDIA%20NIM-AI%20backend-76b900?style=flat-square&logo=nvidia&logoColor=white" alt="NVIDIA NIM">
</p>

---

## What It Does

PROTEUS MCP wraps a [5-agent resume-matching pipeline](https://github.com/DanielDeshmukh/proteus) as 6 discrete MCP tools. Paste a job description and resume into Claude Desktop / Claude Code / OpenCode — get a deterministic match score, gap analysis, bullet rewrites, and a tailored cover letter.

**No vector DB. No black-box scoring. No hosted service.** Just deterministic math over embeddings, exposed as protocol-level tools you can explain in an interview.

### Why MCP?

MCP (Model Context Protocol) is the open standard for connecting AI assistants to external tools. This server proves you understand the protocol — stdio transport, JSON-RPC tool schemas, discrete tool boundaries — not just "I called an LLM API."

---

## Tools

| Tool | Input | Output | Latency |
|------|-------|--------|---------|
| `extract_jd_requirements` | Raw JD text | Structured requirements (skills, seniority, keywords) | ~3s |
| `extract_resume_signals` | Raw resume text | Structured candidate data (skills, experience, education) | ~5s |
| `score_match` | Parsed JD + resume | Overall score + category breakdown | ~2s |
| `generate_gap_report` | Parsed JD + resume | Matched / partial / missing requirements | ~2s |
| `match_resume_to_jd` | Raw JD + resume text | **Fast path** — score + gaps | **4-10s** |
| `match_resume_to_jd_full` | Raw JD + resume text | Full pipeline + rewrites + cover letter | **~90s** |

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- **NVIDIA NIM API key** — [Get one here](https://build.nvidia.com/) (free tier available)
- **Groq API key** — [Get one here](https://console.groq.com/) (free tier available)

### Install

```bash
npm install -g proteus-mcp
```

---

## MCP Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "proteus": {
      "command": "proteus-mcp",
      "env": {
        "NVIDIA_NIM_API_KEY": "nvapi-your-key",
        "GROQ_API_KEY": "gsk-your-key"
      }
    }
  }
}
```

### Claude Code / OpenCode

```json
{
  "mcpServers": {
    "proteus": {
      "command": "proteus-mcp",
      "env": {
        "NVIDIA_NIM_API_KEY": "nvapi-your-key",
        "GROQ_API_KEY": "gsk-your-key"
      }
    }
  }
}
```

---

## Tool Schemas

<details>
<summary><strong>extract_jd_requirements</strong></summary>

**Input:**
```json
{ "jd_text": "Google — Senior Software Engineer..." }
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
</details>

<details>
<summary><strong>extract_resume_signals</strong></summary>

**Input:**
```json
{ "resume_text": "Jane Smith\njane@email.com..." }
```

**Output:**
```json
{
  "name": "Jane Smith",
  "skills": ["Python", "Go", "Kubernetes", ...],
  "experience": [{ "role": "Senior SWE", "company": "Meta", "bullets": [...] }],
  "projects": [...],
  "education": [{ "degree": "MS CS", "institution": "Stanford" }],
  "certifications": [...]
}
```
</details>

<details>
<summary><strong>match_resume_to_jd</strong> (fast path)</summary>

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
    "gaps": [
      {
        "requirement": "Kubernetes",
        "status": "matched",
        "score": 0.95,
        "evidence": "Led migration of 200+ microservices from ECS to Kubernetes",
        "category": "hard_skill"
      }
    ]
  },
  "timings": { "parse": "4.7s", "gap_analysis": "1.9s", "aggregate": "0.0s", "total": "6.6s" }
}
```
</details>

<details>
<summary><strong>match_resume_to_jd_full</strong></summary>

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
    "suggestions": [
      {
        "original": "Built monitoring dashboards",
        "rewrite": "Built real-time monitoring dashboards using Prometheus and Grafana, reducing mean-time-to-detection by 40%",
        "rationale": "Added specific tools from JD and quantified impact",
        "target": "Experience with observability (Prometheus, Grafana)",
        "impact": 0.85
      }
    ],
    "hidden_experience": ["Distributed tracing with OpenTelemetry"]
  },
  "cover_letter": {
    "job_title": "Senior Software Engineer",
    "full_letter": "Dear Hiring Manager,\n\nI am writing to express my interest...",
    "tone": "professional",
    "word_count": 342,
    "key_points_addressed": ["Kubernetes", "distributed systems", "observability"]
  }
}
```
</details>

---

## Determinism

| Component | Deterministic? | Why |
|-----------|---------------|-----|
| `aggregateScores` | **Yes** | Pure math — weighted category scoring, no LLM |
| `analyzeGaps` (embeddings) | **Yes** | Cosine similarity — no temperature, no sampling |
| `parseJd` | **Near-yes** | Temperature pinned to 0; verified identical JSON on repeat |
| `parseResume` | **Near-yes** | Temperature pinned to 0; verified identical JSON on repeat |
| `suggestRewrites` | No | Temperature 0.3, creative generation |
| `generateCoverLetter` | No | Temperature 0.4, creative generation |

The fast-path pipeline (`match_resume_to_jd`) is **effectively deterministic** — identical inputs produce identical scores and gap counts across repeated runs.

### Scoring Formula

```
overall = hard_skills(50%) + domain_keywords(20%) + soft_skills(15%) + ats_bait(15%)

category_score = (matched * 1.0 + partial * 0.6) / total
```

---

## Latency

Measured with real JD + resume pairs (Google Cloud SRE role vs. 7-year backend engineer):

| Stage | Cold Start | Warm |
|-------|-----------|------|
| Parse JD + Resume (parallel) | 4.7s | 2-3s |
| Gap Analysis | 1.9s | 1-2s |
| Aggregate (pure math) | 0.0s | 0.0s |
| **Total (fast path)** | **6.6s** | **4-5s** |
| Rewrite + Cover Letter | +20-40s | +15-30s |
| **Total (full pipeline)** | **~90s** | **~60s** |

---

## Architecture

```
proteus-mcp/
├── src/
│   ├── server.ts                    # MCP server entrypoint, tool registration
│   ├── test.ts                      # End-to-end integration test
│   └── tools/
│       ├── extractJdRequirements.ts # wraps parseJd()
│       ├── extractResumeSignals.ts  # wraps parseResume()
│       ├── scoreMatch.ts            # wraps analyzeGaps() + aggregateScores()
│       ├── generateGapReport.ts     # wraps analyzeGaps()
│       ├── matchResumeToJd.ts       # fast path: parse → gap → aggregate
│       └── matchResumeToJdFull.ts   # full pipeline with rewrites + cover letter
├── .github/workflows/ci.yml        # CI: build, lint, typecheck, test, security
├── models.json                      # PROTEUS model configuration
├── package.json
└── tsconfig.json
```

---

## CI/CD

GitHub Actions runs on every push and PR:

| Job | What it does |
|-----|-------------|
| **Build & Typecheck** | `tsc --noEmit` + `tsc` across Node 18/20/22 |
| **Lint** | ESLint with TypeScript rules |
| **Test** | MCP server startup verification across Node 18/20/22 |
| **Security Audit** | `npm audit --audit-level=high` |
| **Secret Scan** | Scans source for hardcoded API keys |

---

## Privacy

- **No persistence** — resume/JD text never written to disk or logs
- **No auth** — local-only, single-user, no multi-tenant overhead
- **No vector DB** — on-the-fly embedding comparison, not stored
- **No remote transport** — stdio only, no SSE/HTTP exposure
- Calls pipeline functions directly — bypasses Next.js API routes and database

---

## Topics

`mcp` `model-context-protocol` `resume-matching` `jd-analysis` `resume-parser` `career-tools` `nvidia-nim` `embeddings` `cosine-similarity` `deterministic-scoring` `ai-tools` `llm` `typescript` `claude-desktop` `claude-code` `opencode`

---

## Related Projects

- **[PROTEUS](https://github.com/DanielDeshmukh/proteus)** — The full JD-aware resume matching pipeline with web UI, auth, and history
- **[MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)** — Official TypeScript SDK for Model Context Protocol

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built by <a href="https://github.com/DanielDeshmukh">Daniel Deshmukh</a> · Mumbai, India
</p>
