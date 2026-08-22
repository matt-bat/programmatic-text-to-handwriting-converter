# Security policy

## Supported version

Security updates are applied to the latest code on the `main` branch.

## Report a vulnerability

Please use GitHub's private vulnerability reporting feature from the repository Security tab. Do not open a public issue for a vulnerability that could expose private information, enable deceptive document creation, or weaken the identity-free boundary.

Include:

1. A concise description of the issue.
2. The affected browser and operating system.
3. Reproduction steps or a minimal test case.
4. The likely impact.
5. Any suggested mitigation.

You should receive an acknowledgement through GitHub within seven days. Please allow reasonable time for assessment and a coordinated fix before public disclosure.

## Security properties

The official application processes text locally and makes no runtime network requests. It has no authentication system, server database, telemetry, handwriting upload, font upload, image input, signature mode, or writer matching feature.

Generated PDFs contain the source text supplied by the user. Users remain responsible for storing and sharing exported files safely.

The safety-oriented feature scope is not a sandbox for modified source code. Report attempts to bypass the official project's boundaries when they affect the distributed application or its documented behavior.
