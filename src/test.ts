/**
 * PROTEUS MCP Server — End-to-End Test
 *
 * Tests the MCP server by sending JSON-RPC messages over stdio.
 * Runs the fast-path tool (match_resume_to_jd) against a real JD + resume pair.
 */

import { spawn } from "child_process";
import { join } from "path";
import { writeFileSync, appendFileSync } from "fs";

const SERVER_PATH = join(process.cwd(), "src/server.ts");
const LOG_FILE = join(process.cwd(), "test-results.log");

const JD = `Google — Senior Software Engineer, Cloud Platform

Location: Mountain View, CA (Hybrid)
Team: Google Cloud, Infrastructure

About the Role:
We're looking for a Senior Software Engineer to join Google Cloud's infrastructure team. You'll design and build large-scale distributed systems that power Google Cloud's core services.

Requirements:
- 5+ years of software development experience
- Strong proficiency in Go, Python, or Java
- Experience with distributed systems architecture (microservices, gRPC, pub/sub)
- Hands-on experience with Kubernetes and container orchestration
- Understanding of cloud infrastructure (compute, storage, networking)
- Experience with CI/CD pipelines and infrastructure-as-code (Terraform, Pulumi)
- Strong understanding of networking protocols (TCP/IP, HTTP/2, gRPC)
- Experience with observability (Prometheus, Grafana, OpenTelemetry)`;

const RESUME = `Jane Smith
jane.smith@email.com | (415) 555-0142 | San Francisco, CA

SUMMARY
Senior software engineer with 7 years of experience building distributed systems and cloud infrastructure. Previously at Meta and AWS.

EXPERIENCE

Senior Software Engineer — Meta (2021-2024)
- Led migration of 200+ microservices from ECS to Kubernetes, reducing deployment time by 60%
- Built real-time data pipeline processing 1M events/sec using Kafka and Flink
- Designed and implemented distributed caching layer serving 10K RPS with 99.99% uptime

Software Engineer — Amazon Web Services (2018-2021)
- Developed auto-scaling algorithms for EC2 instances that reduced costs by 25%
- Built internal monitoring dashboards using Prometheus and Grafana
- Implemented circuit breaker patterns for cross-region service communication

EDUCATION
MS Computer Science — Stanford University (2018)
BS Computer Science — UC Berkeley (2016)

SKILLS
Python, Go, Java, Kubernetes, Docker, Terraform, AWS, GCP, PostgreSQL, Redis, Kafka, Flink, gRPC, Prometheus, Grafana, CI/CD, Git`;

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(LOG_FILE, line);
}

function sendRequest(proc: any, id: number, method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    const timeout = setTimeout(() => reject(new Error(`Request ${method} timed out after 120s`)), 120_000);

    let buffer = "";
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      // Look for complete JSON-RPC responses
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            clearTimeout(timeout);
            proc.stdout.removeListener("data", onData);
            resolve(msg);
          }
        } catch {}
      }
    };

    proc.stdout.on("data", onData);
    proc.stdin.write(request + "\n");
  });
}

async function main() {
  writeFileSync(LOG_FILE, `MCP Server Test — ${new Date().toISOString()}\n\n`);

  log("Starting MCP server...");
  const isWin = process.platform === "win32";
  const cmd = isWin ? "node.exe" : "node";
  const args = ["--import", "tsx", SERVER_PATH];
  const proc = spawn(cmd, args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    log(`[stderr] ${chunk.toString().trim()}`);
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 3000));

  try {
    // 1. Initialize
    log("\n=== 1. Initialize ===");
    const initResult = await sendRequest(proc, 1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" },
    });
    log(`Server: ${JSON.stringify(initResult.result?.serverInfo)}`);
    log(`Capabilities: ${JSON.stringify(Object.keys(initResult.result?.capabilities || {}))}`);

    // 2. List tools
    log("\n=== 2. List Tools ===");
    const toolsResult = await sendRequest(proc, 2, "tools/list", {});
    const tools = toolsResult.result?.tools || [];
    log(`Found ${tools.length} tools:`);
    for (const t of tools) {
      log(`  - ${t.name}: ${t.description?.substring(0, 80)}...`);
    }

    // 3. Call match_resume_to_jd (fast path)
    log("\n=== 3. Call match_resume_to_jd ===");
    const t0 = Date.now();
    const callResult = await sendRequest(proc, 3, "tools/call", {
      name: "match_resume_to_jd",
      arguments: { jd_text: JD, resume_text: RESUME },
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log(`Elapsed: ${elapsed}s`);

    if (callResult.error) {
      log(`ERROR: ${JSON.stringify(callResult.error)}`);
    } else {
      const text = callResult.result?.content?.[0]?.text;
      if (text) {
        const data = JSON.parse(text);
        log(`Overall score: ${data.overall_score}`);
        log(`Section scores: ${JSON.stringify(data.section_scores)}`);
        log(`Gap analysis: matched=${data.gap_analysis?.matched} partial=${data.gap_analysis?.partial} missing=${data.gap_analysis?.missing} total=${data.gap_analysis?.total}`);
        log(`Timings: ${JSON.stringify(data.timings)}`);
        log(`JD parsed: ${data.jd_parsed?.title} (${data.jd_parsed?.hard_skills_count} hard skills)`);
        log(`Resume parsed: ${data.resume_parsed?.name} (${data.resume_parsed?.skills_count} skills)`);
      }
    }

    // 4. Repeat for determinism check
    log("\n=== 4. Determinism Check (repeat call) ===");
    const t1 = Date.now();
    const callResult2 = await sendRequest(proc, 4, "tools/call", {
      name: "match_resume_to_jd",
      arguments: { jd_text: JD, resume_text: RESUME },
    });
    const elapsed2 = ((Date.now() - t1) / 1000).toFixed(1);
    log(`Elapsed: ${elapsed2}s`);

    if (callResult2.error) {
      log(`ERROR: ${JSON.stringify(callResult2.error)}`);
    } else {
      const text2 = callResult2.result?.content?.[0]?.text;
      if (text2) {
        const data2 = JSON.parse(text2);
        log(`Overall score: ${data2.overall_score}`);
        const text1 = callResult.result?.content?.[0]?.text;
        const data1 = text1 ? JSON.parse(text1) : null;
        log(`Score match: ${data1?.overall_score === data2.overall_score ? "IDENTICAL" : "DIFFERENT"}`);
        log(`Gap match: ${data1?.gap_analysis?.matched === data2.gap_analysis?.matched ? "IDENTICAL" : "DIFFERENT"}`);
      }
    }

    log("\n=== TEST COMPLETE ===");
  } catch (e: any) {
    log(`FATAL: ${e.message}`);
  } finally {
    proc.kill();
    process.exit(0);
  }
}

main();
