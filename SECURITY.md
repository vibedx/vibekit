# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✓         |

## Reporting a Vulnerability

If you discover a security vulnerability in vibekit, please report it responsibly — **do not open a public GitHub issue**.

**To report a vulnerability:**

1. Email the maintainers at the address listed on the [npm package page](https://www.npmjs.com/package/@vibedx/vibekit), or
2. Open a [GitHub Security Advisory](https://github.com/vibedx/vibekit/security/advisories/new) via the Security tab.

**Please include:**
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations (if known)

## What to Expect

- **Acknowledgement** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- Credit in the release notes if you wish (let us know your preference)

## Scope

This project is a local CLI tool. It does not run any servers, transmit data externally, or store credentials. The primary attack surface is:

- Malicious ticket files read from disk
- Dependency vulnerabilities

## Security Best Practices for Users

- Always install vibekit from the official npm registry (`npm install -g @vibedx/vibekit`)
- Keep your Node.js version up to date (>=18 required)
- Review any third-party `.vibe/` directories before running `vibe` commands on them
