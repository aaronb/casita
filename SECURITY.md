# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Casita, please report it through
[GitHub Security Advisories](https://github.com/aaronb/casita/security/advisories/new)
instead of opening a public issue.

You should receive an initial response within 48 hours. If the vulnerability is
confirmed, a fix will be released as soon as practical.

## Scope

Casita runs code inside Docker containers. Security issues of particular interest include:

- Container escape or privilege escalation
- Unintended host filesystem access outside the mounted workspace
- Credential or secret exposure
