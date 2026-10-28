// Scan the exact Git index before publication. Never print matched secret values.
import { execFileSync } from 'node:child_process'

const git = args => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 })
const files = git(['ls-files', '--cached', '-z']).toString('utf8').split('\0').filter(Boolean)
const denied = /^(?:data|node_modules|\.tmp|\.agents|\.playwright-cli|output|coverage|\.cache|docs\/(?:panda-ref|panda-review|shots|reviews))(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|(?:settings|credentials|tokens?|auth|oauth)(?:\.[^.]+)?\.json|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx|exe|db|sqlite3?|log|zip|7z|dmp)$/i
const patterns = [
  ['provider token', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/g],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['Google client secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}/g],
  ['cloud access ID', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['credential in URL', /https?:\/\/[^\s/@:]+:[^\s/@]{8,}@/g],
  ['literal credential', /["']?\b(?:apiKey|api_key|accessToken|access_token|refreshToken|refresh_token|clientSecret|client_secret|password)\b["']?\s*[:=]\s*["']([^"'\r\n]{16,})["']/gi],
]
const fixture = value => /^(?:sk-)?(?:test[-_]|fixture[-_]|dummy[-_]|example[-_]|placeholder|redacted|not[-_]a[-_]real|fake[-_])/i.test(value) || value.includes('${') || value.startsWith('process.env.') || /^\*+$/.test(value)
const issues = []
let bytes = 0
for (const file of files) {
  if (denied.test(file)) { issues.push({ file, reason: 'private or generated path' }); continue }
  let data
  try { data = git(['show', ':' + file]) } catch { issues.push({ file, reason: 'cannot read staged file' }); continue }
  bytes += data.length
  if (data.length > 2 * 1024 * 1024) { issues.push({ file, reason: 'file exceeds publication size limit' }); continue }
  if (data.includes(0)) continue
  const content = data.toString('utf8')
  for (const [reason, regex] of patterns) {
    regex.lastIndex = 0
    for (const match of content.matchAll(regex)) {
      const value = match[1] || match[0]
      if (fixture(value) || (reason === 'literal credential' && /^(?:https?:\/\/|[a-z0-9._/-]+\.(?:json|mjs|ts))/.test(value))) continue
      const line = content.slice(0, match.index).split('\n').length
      issues.push({ file, line, reason })
    }
  }
}
console.log(JSON.stringify({ files: files.length, bytes, issues }, null, 2))
if (issues.length) process.exitCode = 1
