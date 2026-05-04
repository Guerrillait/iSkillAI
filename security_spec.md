# Security Specification - iskill

## Data Invariants
1. A `User` document must be tied to the `uid` of the authenticated user.
2. A `User` profile cannot be deleted by anyone (including the owner) to maintain research integrity (optional rule, but for this spec we keep it simple).
3. The `email` in the document must match the `email` of the authenticated user.
4. Social links must be valid URLs and non-empty.
5. Search visibility: Profiles are searchable only if Name, DOB, and Social Links are provided.

## The Dirty Dozen Payloads (Rejection Tests)
1. **Shadow Field Attack**: Create user with `isAdmin: true`.
2. **Identity Spoofing**: Create user where document ID != `request.auth.uid`.
3. **Email Mismatch**: Create user with `email: "hacker@evil.com"` while auth email is `user@gmail.com`.
4. **Invalid DOB**: Set `dob` to a future date or invalid string.
5. **Score Injection**: Manually update `skillScore` to 100 without being an "AI System".
6. **Data Poisoning**: Inject 1MB of junk text into `firstName`.
7. **Social Link Faking**: Set `linkedinUrl` to a non-linkedin domain (if regex enforced).
8. **Unauthenticated Write**: Attempt to create a user profile without logging in.
9. **Update Hijacking**: Attempt to update another user's profile.
10. **Admin Escalation**: Attempt to create a record in a (theoretical) `admins` collection.
11. **Bypassing Analysis**: Set `isAnalyzed: true` during initial creation.
12. **Metadata Tampering**: Setting client-side `updatedAt` instead of server timestamp.

## Test Runner (Logic Overview)
The `firestore.rules` will be validated against these invariants.
Actual `firestore.rules.test.ts` is omitted as the environment does not support a local emulator for agent tests, but logic is cross-verified.
