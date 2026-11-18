# Local security restriction

This private fork contains picomatch 4.0.7 with its MIT license intact.
The original parser SHA-256 is
4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4.

Reason: CVE-2026-112366 / GHSA-fc5q-39xc-vjpf affects upstream versions
through 4.0.7. As checked on 2026-11-18, the npm latest release is 4.0.7
and the advisory has no first patched version.
https://github.com/advisories/GHSA-fc5q-39xc-vjpf

Local change: both parse() and parse.fastpaths() reject any pattern
containing "+(" or "*(" before building a regular expression. This
intentionally disables all repeated extglobs, including safe repetitions
and escaped literal occurrences. Ordinary *, **, ?, brace alternatives,
character classes and non-repeated extglobs remain supported. Our build
does not require repeated extglobs.

This is a conservative application-specific restriction, not an upstream
security release or a claim that every possible regex denial of service
is solved. The scoped package name identifies the fork; no audit advisory
is globally ignored. web/package.json overrides every picomatch dependency
with this local package. Tests verify the actual installed package identity,
all compiler entry points for the reported pattern classes, a bounded child
process execution time, and normal build glob behavior. CI additionally
builds and runs the browser suite with this dependency.

Maintenance: review future upstream advisories and replace this fork with
an official fixed release when available. Remove the override and this
directory only after the security regressions, build, browser suite and
dependency audits pass. Do not re-enable repeated extglobs without a verified
upstream correction.
