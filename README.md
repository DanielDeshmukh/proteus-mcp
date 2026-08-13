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
    <img src="https://img.shields.io/npm/v/proteus-mcp?style=flat-square&logo=npm&logoColor=white&color=cb3837" alt="npm version">
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

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Tools](#tools)
- [Quick Start](#quick-start)
- [Tool Usage Guide](#tool-usage-guide)
- [CLI Reference](#cli-reference)
- [Determinism](#determinism)
- [Latency](#latency)
- [Architecture](#architecture)
- [CI/CD](#cicd)
- [Privacy](#privacy)
- [Topics](#topics)
- [Related Projects](#related-projects)
- [License](#license)

---

## What It Does

PROTEUS MCP wraps a [5-agent resume-matching pipeline](https://github.com/DanielDeshmukh/proteus) as 6 discrete MCP tools. Paste a job description and resume into Claude Desktop / Claude Code / OpenCode — get a deterministic match score, gap analysis, bullet rewrites, and a tailored cover letter.

**No vector DB. No black-box scoring. No hosted service.** Just deterministic math over embeddings, exposed as protocol-level tools you can explain in an interview.

### Why MCP?

MCP (Model Context Protocol) is the open standard for connecting AI assistants to external tools. This server proves you understand the protocol — stdio transport, JSON-RPC tool schemas, discrete tool boundaries — not just "I called an LLM API."

### How It Works

1. **Install once:**
   ```bash
   npm install -g proteus-mcp
   ```

2. **Configure in Claude Desktop/Code:**
   ```json
   {
     "mcpServers": {
       "proteus": {
         "command": "proteus-mcp",
         "env": {
           "NVIDIA_NIM_API_KEY": "nvapi-xxx",
           "GROQ_API_KEY": "gsk-xxx"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop/Code**

4. **Use naturally in chat:**
   > "Here's a job description: [paste JD]. Here's my resume: [paste resume]. What's my match score?"

Claude automatically calls the MCP tools behind the scenes — you never see JSON-RPC or tool calls. You just chat naturally and get a match score, gap analysis, bullet rewrites, and a cover letter.

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

---

## Tool Usage Guide

### `extract_jd_requirements`

Parse a raw job description into structured requirements.

```typescript
const result = await client.callTool({
  name: "extract_jd_requirements",
  arguments: {
    jd_text: `
      Google — Senior Software Engineer, Cloud Platform

      Requirements:
      - 5+ years of experience in distributed systems
      - Strong proficiency in Go or Python
      - Experience with Kubernetes, Terraform, and CI/CD pipelines
      - Familiarity with gRPC and microservices architecture
      - Excellent communication and leadership skills
    `
  }
});
```

**Response:**
```json
{
  "title": "Senior Software Engineer, Cloud Platform",
  "company": "Google",
  "seniority_level": "senior",
  "hard_skills": ["Go", "Python", "Kubernetes", "Terraform", "gRPC", "CI/CD"],
  "soft_skills": ["leadership", "communication"],
  "domain_keywords": ["distributed systems", "cloud infrastructure", "microservices"],
  "ats_bait": ["Kubernetes", "Terraform", "gRPC", "CI/CD"],
  "requirements_summary": "5+ years experience in distributed systems with Go/Python and Kubernetes"
}
```

---

### `extract_resume_signals`

Parse a raw resume into structured candidate data.

```typescript
const result = await client.callTool({
  name: "extract_resume_signals",
  arguments: {
    resume_text: `
      Jane Smith
      jane@email.com | (555) 123-4567 | San Francisco, CA

      EXPERIENCE
      Senior Software Engineer | Meta | 2021-Present
      - Led migration of 200+ microservices from ECS to Kubernetes
      - Built real-time monitoring dashboards using Prometheus and Grafana
      - Reduced mean-time-to-detection by 40% through observability improvements

      EDUCATION
      MS Computer Science | Stanford University | 2019
      BS Computer Science | UC Berkeley | 2017
    `
  }
});
```

**Response:**
```json
{
  "name": "Jane Smith",
  "email": "jane@email.com",
  "skills": ["Go", "Python", "Kubernetes", "Prometheus", "Grafana", "ECS"],
  "experience": [
    {
      "role": "Senior Software Engineer",
      "company": "Meta",
      "bullets": [
        "Led migration of 200+ microservices from ECS to Kubernetes",
        "Built real-time monitoring dashboards using Prometheus and Grafana",
        "Reduced mean-time-to-detection by 40% through observability improvements"
      ]
    }
  ],
  "education": [
    { "degree": "MS Computer Science", "institution": "Stanford University" },
    { "degree": "BS Computer Science", "institution": "UC Berkeley" }
  ],
  "certifications": []
}
```

---

### `match_resume_to_jd` (Fast Path)

Score a resume against a JD with gap analysis — no rewrites or cover letter.

```typescript
const result = await client.callTool({
  name: "match_resume_to_jd",
  arguments: {
    jd_text: "Google — Senior Software Engineer... (full JD text)",
    resume_text: "Jane Smith\njane@email.com... (full resume text)"
  }
});
```

**Response:**
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
      },
      {
        "requirement": "Terraform",
        "status": "partial",
        "score": 0.6,
        "evidence": "Used IaC tools but no direct Terraform mention",
        "category": "hard_skill"
      },
      {
        "requirement": "gRPC",
        "status": "missing",
        "score": 0.0,
        "evidence": null,
        "category": "hard_skill"
      }
    ]
  },
  "timings": {
    "parse": "4.7s",
    "gap_analysis": "1.9s",
    "aggregate": "0.0s",
    "total": "6.6s"
  }
}
```

---

### `match_resume_to_jd_full`

Full pipeline: score, gaps, bullet rewrites, and tailored cover letter.

```typescript
const result = await client.callTool({
  name: "match_resume_to_jd_full",
  arguments: {
    jd_text: "Google — Senior Software Engineer... (full JD text)",
    resume_text: "Jane Smith\njane@email.com... (full resume text)",
    cover_letter_tone: "professional"
  }
});
```

**Response:** (includes everything from `match_resume_to_jd` plus)
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
    "full_letter": "Dear Hiring Manager,\n\nI am writing to express my interest in the Senior Software Engineer position at Google...",
    "tone": "professional",
    "word_count": 342,
    "key_points_addressed": ["Kubernetes", "distributed systems", "observability"]
  }
}
```

---

### `score_match`

Score pre-parsed JD and resume signals (requires output from `extract_jd_requirements` and `extract_resume_signals`).

```typescript
const jd = await client.callTool({
  name: "extract_jd_requirements",
  arguments: { jd_text: "..." }
});

const resume = await client.callTool({
  name: "extract_resume_signals",
  arguments: { resume_text: "..." }
});

const score = await client.callTool({
  name: "score_match",
  arguments: {
    jd_requirements: jd.content,
    resume_signals: resume.content
  }
});
```

---

### `generate_gap_report`

Generate gap analysis from pre-parsed signals.

```typescript
const gaps = await client.callTool({
  name: "generate_gap_report",
  arguments: {
    jd_requirements: jd.content,
    resume_signals: resume.content
  }
});
```

[↑ Back to Top](#table-of-contents)

---

## CLI Reference

### Global Install

```bash
npm install -g proteus-mcp
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NVIDIA_NIM_API_KEY` | Yes | API key for NVIDIA NIM embedding and LLM services |
| `GROQ_API_KEY` | Yes | API key for Groq LLM inference |

### Running the Server

```bash
# Start MCP server (stdio transport — used by Claude Desktop / Claude Code)
proteus-mcp

# Or with inline env vars
NVIDIA_NIM_API_KEY=nvapi-xxx GROQ_API_KEY=gsk-xxx proteus-mcp
```

### Using with Claude Desktop

Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

### Using with Claude Code / OpenCode

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

### CLI Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help message |
| `--version` | Show installed version |

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

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

[↑ Back to Top](#table-of-contents)

---

## Privacy

- **No persistence** — resume/JD text never written to disk or logs
- **No auth** — local-only, single-user, no multi-tenant overhead
- **No vector DB** — on-the-fly embedding comparison, not stored
- **No remote transport** — stdio only, no SSE/HTTP exposure
- Calls pipeline functions directly — bypasses Next.js API routes and database

[↑ Back to Top](#table-of-contents)

---

## Topics

`mcp` `model-context-protocol` `resume-matching` `jd-analysis` `resume-parser` `career-tools` `nvidia-nim` `embeddings` `cosine-similarity` `deterministic-scoring` `ai-tools` `llm` `typescript` `claude-desktop` `claude-code` `opencode`

[↑ Back to Top](#table-of-contents)

---

## Related Projects

- **[PROTEUS](https://github.com/DanielDeshmukh/proteus)** — The full JD-aware resume matching pipeline with web UI, auth, and history
- **[MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)** — Official TypeScript SDK for Model Context Protocol

[↑ Back to Top](#table-of-contents)

---

## License

[MIT](LICENSE)

[↑ Back to Top](#table-of-contents)

---

<p align="center">
  Built by <a href="https://github.com/DanielDeshmukh">Daniel Deshmukh</a> · Mumbai, India
</p>
