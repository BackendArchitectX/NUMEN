export interface SourceUrlAssessment {
  normalized?: string
  issue?: 'INVALID' | 'UNSUPPORTED_SCHEME' | 'CREDENTIALS' | 'NON_STANDARD_PORT' | 'NON_PUBLIC_HOST'
}

export function assessPublicHttpUrl(value: string): SourceUrlAssessment {
  const trimmed = value.trim()
  if (!trimmed) return { issue: 'INVALID' }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { issue: 'INVALID' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { issue: 'UNSUPPORTED_SCHEME' }
  }
  if (!parsed.hostname) return { issue: 'INVALID' }
  if (parsed.username || parsed.password) return { issue: 'CREDENTIALS' }

  const explicitPort = parsed.port
  if (explicitPort && explicitPort !== '80' && explicitPort !== '443') {
    return { issue: 'NON_STANDARD_PORT' }
  }
  if (isObviouslyNonPublicHost(parsed.hostname)) {
    return { issue: 'NON_PUBLIC_HOST' }
  }

  parsed.hash = ''
  return { normalized: parsed.toString() }
}

export function normalizePublicHttpUrl(value: string): string | undefined {
  return assessPublicHttpUrl(value).normalized
}

export function safeExternalHttpUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  return normalizePublicHttpUrl(value)
}

export function sourceHostname(value?: string | null): string {
  const safe = safeExternalHttpUrl(value)
  if (!safe) return ''
  try {
    return new URL(safe).hostname
  } catch {
    return ''
  }
}

export function sourceDisplayLabel(value: string, maxPathLength = 28): string {
  const safe = safeExternalHttpUrl(value)
  if (!safe) return 'Invalid source'
  const url = new URL(safe)
  const path = url.pathname === '/' ? '' : url.pathname
  const clippedPath = path.length > maxPathLength ? `${path.slice(0, Math.max(1, maxPathLength - 1))}…` : path
  return `${url.hostname}${clippedPath}`
}

export function sourceUrlValidationMessage(value: string): string | undefined {
  if (!value.trim()) return undefined
  const assessment = assessPublicHttpUrl(value)
  switch (assessment.issue) {
    case 'INVALID':
      return 'Enter a complete public HTTP(S) URL.'
    case 'UNSUPPORTED_SCHEME':
      return 'Only HTTP(S) source URLs are supported.'
    case 'CREDENTIALS':
      return 'Remove embedded username or password information from the source URL.'
    case 'NON_STANDARD_PORT':
      return 'Use a standard HTTP(S) URL on port 80 or 443.'
    case 'NON_PUBLIC_HOST':
      return 'Use a public internet source. Local and private-network targets are not allowed.'
    default:
      return undefined
  }
}

export function extractPublicHttpUrls(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s,;]+/gi) ?? []
  const unique: string[] = []
  for (const match of matches) {
    const normalized = normalizePublicHttpUrl(match.replace(/[.)\]}]+$/, ''))
    if (normalized && !unique.includes(normalized)) unique.push(normalized)
  }
  return unique
}

function isObviouslyNonPublicHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
  ) return true

  const ipv6 = host.includes(':')
  if (host === '::1' || host === '::') return true
  if (ipv6 && (host.startsWith('fc') || host.startsWith('fd'))) return true
  if (ipv6 && /^fe[89ab][0-9a-f]:/i.test(host)) return true

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) return false
  const octets = ipv4.slice(1).map(Number)
  if (octets.some(part => part < 0 || part > 255)) return true

  const [a, b, c] = octets
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true
  if (a === 203 && b === 0 && c === 113) return true
  return false
}
