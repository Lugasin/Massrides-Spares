import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (rel.includes('node_modules') || rel.includes('.git')) continue;
      walk(rel, acc);
    } else {
      acc.push(rel);
    }
  }
  return acc;
}

const findings = [];
const add = (severity, domain, title, evidence, recommendation) => {
  findings.push({ severity, domain, title, evidence, recommendation });
};

// 1) Duplicate Vesicash webhook handlers
const webhookHandlers = [
  'supabase/functions/handle-payment-webhook/index.ts',
  'supabase/functions/handle-vesicash-webhook/index.ts',
].filter(exists);

if (webhookHandlers.length > 1) {
  const legacy = exists('supabase/functions/handle-payment-webhook/index.ts')
    ? read('supabase/functions/handle-payment-webhook/index.ts')
    : '';
  if (!/LEGACY_ALIAS_OK/.test(legacy)) {
    add(
      'critical',
      'payments',
      'Duplicate Vesicash webhook handlers detected',
      webhookHandlers,
      'Keep one canonical webhook endpoint with strict signature verification and idempotency.'
    );
  }
}

// 2) Webhook signature verification inconsistency
if (exists('supabase/functions/handle-payment-webhook/index.ts')) {
  const t = read('supabase/functions/handle-payment-webhook/index.ts');
  if (/trust the payload/i.test(t) || !/signature/i.test(t)) {
    add(
      'critical',
      'payments',
      'Webhook handler trusts payload without signature verification',
      ['supabase/functions/handle-payment-webhook/index.ts'],
      'Reject unsigned/invalid webhook payloads and add replay protection.'
    );
  }
}

if (exists('supabase/functions/handle-vesicash-webhook/index.ts')) {
  const t = read('supabase/functions/handle-vesicash-webhook/index.ts');
  if (/createHmac/.test(t) && /x-vesicash-signature/.test(t)) {
    add(
      'info',
      'payments',
      'Verified webhook signature logic present in one handler',
      ['supabase/functions/handle-vesicash-webhook/index.ts'],
      'Consolidate all webhook traffic through this hardened pattern only.'
    );
  }
}

// 3) Direct role mutation from frontend
if (exists('src/pages/UserManagement.tsx')) {
  const t = read('src/pages/UserManagement.tsx');
  if (/from\('user_profiles'\)\.update\(\{ role: newRole \}\)/.test(t)) {
    add(
      'high',
      'authz',
      'Frontend directly updates user roles',
      ['src/pages/UserManagement.tsx'],
      'Route role updates through a guarded server-side function only.'
    );
  }
}

// 4) Function invocations with missing implementations
const allFiles = walk('src').filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
const invokeNames = new Set();
for (const f of allFiles) {
  const t = read(f);
  for (const m of t.matchAll(/functions\.invoke\(\s*['"]([^'"]+)['"]/g)) {
    invokeNames.add(m[1]);
  }
}
const fnDirs = exists('supabase/functions')
  ? fs
      .readdirSync(path.join(root, 'supabase/functions'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  : [];

const missing = [...invokeNames].filter((name) => !fnDirs.includes(name));
if (missing.length) {
  add(
    'high',
    'ops',
    'Frontend invokes edge functions that are missing from repository',
    missing,
    'Implement or remove dead control-plane actions to avoid silent operational failures.'
  );
}

// 5) Checkout error semantics
if (exists('supabase/functions/create-order/index.ts')) {
  const t = read('supabase/functions/create-order/index.ts');
  if (/status:\s*200\s*,\s*\/\/ Return 200 to allow client to parse error message/.test(t)) {
    add(
      'high',
      'checkout',
      'Checkout function returns HTTP 200 for failures',
      ['supabase/functions/create-order/index.ts'],
      'Return proper non-2xx status codes for failure paths.'
    );
  }
}

// 6) Broad CORS in edge functions
const edgeFiles = walk('supabase/functions').filter((f) => f.endsWith('.ts'));
const wildcardCors = edgeFiles.filter((f) => /Access-Control-Allow-Origin'\s*:\s*'\*'|Access-Control-Allow-Origin"\s*:\s*"\*"/.test(read(f)));
if (wildcardCors.length) {
  add(
    'medium',
    'security',
    'Wildcard CORS detected in edge functions',
    wildcardCors.slice(0, 10),
    'Use explicit allowlist origins for privileged endpoints.'
  );
}

// 7) Hardcoded DB credentials in scripts
if (exists('scripts/check_rls.js')) {
  const t = read('scripts/check_rls.js');
  if (/postgres:\/\//.test(t)) {
    add(
      'critical',
      'secrets',
      'Hardcoded database connection string found in script',
      ['scripts/check_rls.js'],
      'Remove hardcoded credentials and rotate exposed secrets immediately.'
    );
  }
}

const scoreMap = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
const riskScore = findings.reduce((sum, f) => sum + (scoreMap[f.severity] ?? 0), 0);
let readiness = 'GO';
if (riskScore >= 80) readiness = 'NO-GO';
else if (riskScore >= 40) readiness = 'HOLD';

const now = new Date().toISOString();
const output = {
  generated_at: now,
  findings_count: findings.length,
  risk_score: riskScore,
  readiness,
  findings,
};

fs.writeFileSync(path.join(root, 'audit-results.json'), JSON.stringify(output, null, 2));

const md = [
  '# Production Audit Run Results',
  '',
  `Generated: ${now}`,
  `Readiness: **${readiness}**`,
  `Risk Score: **${riskScore}**`,
  `Findings: **${findings.length}**`,
  '',
  '## Findings',
  '',
  ...findings.map((f, i) => [
    `### ${i + 1}. [${f.severity.toUpperCase()}] ${f.title}`,
    `- Domain: ${f.domain}`,
    `- Evidence: ${Array.isArray(f.evidence) ? f.evidence.join(', ') : String(f.evidence)}`,
    `- Recommendation: ${f.recommendation}`,
    '',
  ].join('\n')),
  '## Next Step',
  '',
  readiness === 'NO-GO'
    ? 'Do not launch to production until critical/high items are remediated and re-audited.'
    : 'Address findings and re-run the audit before launch.',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'docs/PRODUCTION_AUDIT_RUN_RESULTS.md'), md);

console.log(`Audit complete: ${findings.length} findings, risk score ${riskScore}, readiness ${readiness}`);
