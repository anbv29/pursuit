# Report request-size recovery, 2026-10-24

The hosted Libra report failed at market research with an upstream HTTP 400.
The same hosted/local model and credential fingerprint matched. The account had
24 of 50 requests remaining when checked, so daily quota was not exhausted.

A public-only local reproduction with one source completed. Read-only inspection
of the actual failed report showed twelve public company sources, no founder answers
and no other founder input. Automatic approval review initially blocked replaying the
saved context; after these non-sensitive metadata checks, reconsideration approved it.

The exact saved stage produced a 67,555-byte request and was rejected twice by
AtlasCloud with a generic bad-request response. A version with bounded source excerpts
was 28,545 bytes and succeeded. This demonstrates the context-volume fix for this
request; the provider did not document an exact maximum in its rejection.

The normal transport now packs oversized JSON context under a conservative 60,000-byte
budget. It preserves source identities, stored full evidence, founder answers, system
instructions, output schemas and zero-price/privacy controls. Synthesis context is JSON
so its document portions can be reduced safely. Requests that still cannot fit fail
before transmission rather than cutting arbitrary JSON or instructions.

Transient wrapped upstream failures get at most one identical retry. Authentication,
quota and ordinary invalid requests do not. Only safe status/categories are logged.

Final targeted verification: 66 passed in 63.24 seconds. Includes UTF-8 byte budgets,
all-source preservation, immutable original data, schema/routing preservation, hard
retry bounds, error redaction, previews, deep research and report checkpoint/lifecycle.
The exact previously failing stage also succeeded live with the normal patched adapter.
These backend fixes are local until a backend-only publish/deploy is approved.
