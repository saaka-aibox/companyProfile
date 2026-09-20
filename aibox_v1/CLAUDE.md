@AGENTS.md
# AIBOX Company Profile Platform — Engineering Agent Instructions

## 1. Project Identity

You are an expert software engineer working on the **AIBOX Company Profile Platform**.

This project is not a single hardcoded company-profile website.

It is a **reproducible, configuration-driven Company Profile Engine** where the public website and its behavior can be managed through a separate management system/CMS.

The first implementation is for **AIBOX**, but the architecture MUST allow the same codebase and platform to support other companies, brands, sites, or tenants in the future.

The fundamental principle is:

> **Build the engine, not the website.**

AIBOX is an instance of the engine.

---

# 2. Core Architecture Principle

The system MUST follow:

```text
Configuration
      ↓
Schema Validation
      ↓
Domain Layer
      ↓
Renderer / Runtime
      ↓
Next.js
      ↓
Public Website
```

The CMS MUST configure the system rather than directly control implementation code.

Do NOT hardcode company-specific behavior into reusable components.

Prefer:

```text
Configuration → Behavior
```

over:

```text
Hardcoded Company Logic → Behavior
```

---

# 3. Technology Stack

The default technology stack is:

### Frontend

* Next.js
* React
* TypeScript
* Server Components by default
* Client Components only when interactivity requires them

### Backend / Application

* Next.js Server Actions and/or API routes
* Domain-driven application services
* Repository pattern where appropriate

### Database

* PostgreSQL
* Prisma ORM

### Validation

* Zod

### Cache / Performance

* Redis where caching materially improves performance

### Media

* Object storage for images, videos, documents, and other binary assets

### Testing

* Unit tests
* Integration tests
* End-to-end tests

### Repository

* Monorepo architecture
* Prefer pnpm
* Turborepo may be used for task orchestration

---

# 4. Monorepo Architecture

The preferred structure is:

```text
/
├── apps/
│   ├── web/
│   │   └── Public Company Profile
│   │
│   └── studio/
│       └── CMS / Management System
│
├── packages/
│   ├── ui/
│   ├── components/
│   ├── renderer/
│   ├── schemas/
│   ├── domain/
│   ├── database/
│   ├── auth/
│   ├── design-system/
│   ├── api/
│   └── utils/
│
├── infrastructure/
├── docs/
├── tests/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── AGENTS.md
```

Do not introduce unnecessary application duplication.

Shared functionality belongs in `packages/`.

---

# 5. Public Website vs Management System

There are two primary applications.

## `apps/web`

The public-facing company profile.

Responsibilities:

* Rendering published content
* SEO
* Performance
* Accessibility
* Responsive UI
* Structured data
* Public forms
* Analytics
* Public navigation
* Published configuration consumption

The public website MUST NOT depend on draft content.

It should consume the **published configuration/snapshot**.

---

## `apps/studio`

The management/CMS application.

Responsibilities:

* Authentication
* Authorization
* Page management
* Section management
* Component configuration
* Theme management
* Navigation management
* Media management
* Form management
* SEO management
* Draft management
* Preview
* Revision history
* Approval workflow
* Publishing
* Rollback
* Audit logs
* Site settings

The Studio MUST NOT contain a second independent rendering implementation.

Preview should use the same rendering engine as production.

---

# 6. Company Profile Engine

The system MUST be designed around reusable primitives.

Examples:

```text
Hero
Feature Grid
Product Showcase
Service Grid
Statistics
Timeline
Testimonial
Team
Logo Cloud
FAQ
Contact Form
CTA
Footer
Navigation
```

Components MUST be reusable across different sites.

Avoid:

```text
AiboxHero
AiboxHomepage
AiboxProductSection
```

Prefer:

```text
Hero
PageRenderer
SectionRenderer
```

Company-specific content belongs in configuration.

---

# 7. Component Registry

The renderer MUST use a component registry.

Conceptually:

```typescript
const componentRegistry = {
  hero: {
    component: Hero,
    schema: HeroSchema,
  },

  featureGrid: {
    component: FeatureGrid,
    schema: FeatureGridSchema,
  },

  cta: {
    component: CTA,
    schema: CTASchema,
  },
};
```

The registry is the boundary between CMS configuration and React implementation.

A CMS configuration such as:

```json
{
  "type": "hero",
  "variant": "split"
}
```

should resolve through the registry.

Do not dynamically execute arbitrary JavaScript from CMS data.

---

# 8. Schema-Driven Architecture

All dynamic configuration MUST have a schema.

Use Zod or an equivalent strongly typed validation system.

Example:

```typescript
const HeroSchema = z.object({
  type: z.literal("hero"),
  variant: z.enum(["default", "split", "centered"]),
  props: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
  }),
});
```

Never trust CMS configuration blindly.

Validate:

```text
CMS Input
   ↓
Schema Validation
   ↓
Domain Validation
   ↓
Persistence
```

and again before publishing.

---

# 9. Content, Layout, and Theme Separation

These concepts MUST remain separate.

## Content

```json
{
  "title": "Intelligent Industrial Solutions",
  "description": "..."
}
```

## Layout

```json
{
  "variant": "split",
  "alignment": "left",
  "container": "wide"
}
```

## Theme

```json
{
  "colors": {
    "primary": "...",
    "background": "...",
    "text": "..."
  }
}
```

Do not mix raw design values into content unless there is a legitimate component-specific reason.

---

# 10. Design System

The platform MUST use design tokens.

Prefer:

```tsx
<Button variant="primary" />
```

over:

```tsx
<Button color="#01B574" />
```

Prefer semantic tokens:

```text
primary
secondary
background
surface
text
muted
border
success
warning
danger
```

rather than scattering raw hexadecimal values throughout the codebase.

Typography, spacing, radius, shadows, breakpoints, and colors should be tokenized.

---

# 11. Theme Architecture

Themes must be replaceable without rewriting components.

Conceptually:

```text
Theme
 ├── Colors
 ├── Typography
 ├── Spacing
 ├── Radius
 ├── Shadows
 ├── Layout
 └── Motion
```

Components should consume semantic design tokens.

Do not make components dependent on the AIBOX visual identity.

---

# 12. Multi-Tenant Readiness

Even if the initial deployment only serves AIBOX, design the domain around:

```text
Organization
    ↓
Site
    ↓
Pages
    ↓
Revisions
    ↓
Content
```

Avoid hardcoding:

```typescript
const company = "AIBOX";
```

throughout the application.

The system should eventually support:

```text
Organization A
Organization B
Organization C
```

using the same engine.

---

# 13. Database Architecture

PostgreSQL is the primary database.

Prisma is the ORM.

Use relational tables for structured domain relationships.

Use PostgreSQL JSONB for flexible configuration where appropriate.

This is intentional.

Prefer:

```text
Relational Data
+
JSONB Configuration
```

rather than attempting to model every CMS component property as a separate database column.

---

# 14. Important Domain Entities

The architecture should be able to support entities such as:

```text
Organization
Site
User
Role
Permission

Page
PageRevision
Section

Component
Theme
Navigation

Media
Form
Workflow

Publication
AuditLog
```

Do not introduce all entities prematurely.

Add domain entities when they are required by actual functionality.

---

# 15. Page Architecture

A page should conceptually contain:

```text
Page
 ├── Metadata
 ├── SEO
 ├── Status
 ├── Revisions
 └── Sections
```

A section should conceptually contain:

```text
Section
 ├── id
 ├── type
 ├── variant
 ├── props
 └── configuration
```

Example:

```json
{
  "id": "hero-001",
  "type": "hero",
  "variant": "split",
  "props": {
    "title": "Industrial Intelligence",
    "description": "..."
  }
}
```

---

# 16. Draft and Publishing Model

Never let arbitrary draft changes immediately affect production.

Use:

```text
DRAFT
   ↓
IN_REVIEW
   ↓
APPROVED
   ↓
PUBLISHED
   ↓
ARCHIVED
```

Publishing should conceptually perform:

```text
Draft
 ↓
Schema Validation
 ↓
Domain Validation
 ↓
Create Immutable Snapshot
 ↓
Publish
 ↓
Invalidate Cache
 ↓
Revalidate Website
```

The public website should consume the published version.

---

# 17. Revision System

Configuration must be versionable.

Example:

```text
Homepage
├── Revision 1
├── Revision 2
├── Revision 3
└── Revision 4 ← Published
```

Never overwrite historical published configurations destructively.

The system should make rollback possible.

Prefer:

```text
Publish Revision 7
```

over:

```text
Update current page in-place
```

---

# 18. Schema Versioning

Dynamic configuration MUST support schema evolution.

Example:

```json
{
  "schemaVersion": 1
}
```

When configuration changes structurally:

```text
v1 → v2
```

provide a migration strategy.

Do not assume today's JSON structure will remain unchanged forever.

---

# 19. Workflow Architecture

Workflow/flow logic should be configuration-driven where appropriate.

Use predefined safe actions.

Examples:

```text
SHOW_SECTION
HIDE_SECTION
REDIRECT
SUBMIT_FORM
SEND_EMAIL
OPEN_MODAL
TRACK_EVENT
SET_VALUE
CONDITION
API_REQUEST
```

Do NOT execute arbitrary JavaScript from CMS configuration.

Avoid `eval`.

Avoid arbitrary executable code stored in the database.

---

# 20. Domain Layer

Business logic should not be tightly coupled to React components.

Prefer:

```text
UI
 ↓
Server Action / API
 ↓
Application Service
 ↓
Domain Logic
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
```

Do not put complex business logic directly inside:

```text
React components
route handlers
Server Actions
```

Server Actions should orchestrate application behavior, not become the entire business layer.

---

# 21. Repository Pattern

Use repositories when database access is sufficiently complex or reused.

Example:

```typescript
interface PageRepository {
  findBySlug(siteId: string, slug: string): Promise<Page | null>;
  create(data: CreatePageInput): Promise<Page>;
  update(id: string, data: UpdatePageInput): Promise<Page>;
}
```

Avoid abstracting trivial database operations purely for the sake of abstraction.

Architecture should reduce complexity, not increase it.

---

# 22. API Design

APIs should expose domain concepts rather than database internals.

Good:

```text
GET /api/sites/:siteId/pages/:slug
POST /api/pages/:pageId/publish
GET /api/pages/:pageId/revisions
```

Avoid exposing internal database implementation details.

API contracts should be typed and validated.

---

# 23. Authentication and Authorization

Authentication and authorization are separate concerns.

Use:

```text
Authentication
      ↓
Identity
      ↓
Role
      ↓
Permission
      ↓
Resource Access
```

Use granular permissions such as:

```text
page:create
page:read
page:update
page:publish

theme:update

media:upload

navigation:update

user:manage
```

Do not rely exclusively on:

```typescript
if (user.role === "admin")
```

for every authorization decision.

---

# 24. Security Rules

Never:

* Execute arbitrary JavaScript from CMS data
* Use `eval`
* Trust client-side authorization
* Expose secrets to the browser
* Store credentials in source code
* Trust raw user input
* Build SQL using string concatenation
* Disable validation for convenience
* Bypass authentication for development code that may reach production

Validate all externally controlled input.

Server-side authorization is mandatory.

---

# 25. Next.js Rules

Prefer Server Components by default.

Use Client Components only when required for:

* Interaction
* Browser APIs
* State
* Event handlers
* Animations requiring client-side execution

Do not add:

```tsx
"use client";
```

to entire page trees without a clear reason.

Keep the public website as server-renderable as possible.

---

# 26. Performance

Performance is a first-class requirement.

Prioritize:

* Server Components
* Streaming where appropriate
* Static/cached rendering
* CDN caching
* Image optimization
* Minimal client JavaScript
* Lazy loading
* Proper font loading
* Efficient database queries
* Redis/cache where appropriate

Avoid unnecessary:

```text
client-side fetching
large JavaScript bundles
duplicate requests
N+1 queries
unoptimized images
```

---

# 27. SEO

The public website must support:

* Metadata
* Open Graph
* Twitter/X cards
* Canonical URLs
* Sitemap
* Robots configuration
* Structured data
* Semantic HTML
* Proper heading hierarchy

SEO configuration should be manageable through the CMS where appropriate.

---

# 28. Accessibility

Target WCAG-aligned accessibility.

Components should support:

* Keyboard navigation
* Semantic HTML
* Visible focus states
* Proper labels
* Accessible forms
* Appropriate ARIA only when necessary
* Sufficient contrast
* Reduced motion preferences
* Screen-reader compatibility

Accessibility should be implemented in shared components rather than repeatedly fixed at page level.

---

# 29. Responsive Design

Design for:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Do not create completely separate implementations for each breakpoint unless technically necessary.

Use responsive design tokens and layouts.

---

# 30. Media Architecture

Binary files must not be stored directly inside PostgreSQL.

Use object storage.

Database should store metadata such as:

```text
id
url/key
mimeType
size
width
height
alt
createdAt
```

Images must have meaningful alt text where appropriate.

---

# 31. Error Handling

Errors must be intentional and actionable.

Avoid:

```typescript
catch (error) {
  console.log(error);
}
```

without handling the failure.

Distinguish:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Conflict
Infrastructure Error
Unexpected Error
```

Do not leak internal stack traces or sensitive implementation details to users.

---

# 32. Logging and Observability

Important operations should be observable.

Track meaningful events such as:

```text
Page Created
Page Updated
Page Published
Page Rolled Back
Theme Updated
Media Uploaded
User Permission Changed
Workflow Executed
```

Production systems should support:

```text
Logs
Metrics
Error Tracking
Audit Logs
```

Do not use excessive console logging as the primary observability strategy.

---

# 33. Audit Logging

Administrative changes should be auditable.

An audit record should conceptually contain:

```text
actor
action
resource
resourceId
timestamp
metadata
```

Examples:

```text
PAGE_UPDATED
PAGE_PUBLISHED
THEME_UPDATED
USER_PERMISSION_CHANGED
```

Audit logs should be append-oriented and should not be casually modified.

---

# 34. Testing Strategy

Use multiple testing levels.

## Unit

Test:

* Domain logic
* Validators
* Utility functions
* Configuration transformations

## Integration

Test:

* Database operations
* Repositories
* Publishing
* Authentication/authorization
* API behavior

## E2E

Test critical user journeys.

Example:

```text
Login
 ↓
Create Page
 ↓
Add Section
 ↓
Edit Content
 ↓
Preview
 ↓
Publish
 ↓
Open Public Website
 ↓
Verify Published Content
```

This workflow is critical.

---

# 35. TypeScript Rules

Use strict TypeScript.

Prefer explicit domain types.

Avoid:

```typescript
any
```

unless there is a documented and justified reason.

Prefer:

```typescript
unknown
```

with validation when the input is untrusted.

Do not use type assertions to hide incorrect architecture.

Bad:

```typescript
const data = response as SomeType;
```

Good:

```text
unknown
 ↓
schema validation
 ↓
typed data
```

---

# 36. Naming

Use clear, domain-oriented names.

Prefer:

```text
PageRepository
PublishPage
PageRevision
ThemeService
ComponentRegistry
```

Avoid vague names such as:

```text
Manager
Helper
Handler
Util
Data
Stuff
Common
```

unless the abstraction is genuinely generic.

---

# 37. Component Design

Components should be:

* Reusable
* Composable
* Accessible
* Typed
* Responsive
* Theme-aware

Avoid components containing unrelated responsibilities.

Bad:

```text
MegaCompanyPageComponent
```

Good:

```text
Hero
ProductGrid
Stats
CTA
ContactForm
```

---

# 38. Avoid Premature Abstraction

Do not create abstractions simply because they might be useful someday.

First identify a real repeated pattern.

Then abstract it.

The architecture must be:

```text
Flexible
but not
Over-engineered
```

---

# 39. Avoid Hardcoded Company Content

Company-specific information belongs in configuration/content.

Avoid:

```tsx
<h1>AIBOX - AI Industrial Solutions</h1>
```

inside reusable components.

Prefer:

```tsx
<h1>{content.title}</h1>
```

Company-specific values should come from the content/configuration layer.

---

# 40. Configuration Boundary

Always maintain this boundary:

```text
CMS
 │
 │ configuration
 ▼
Schema
 │
 ▼
Domain
 │
 ▼
Renderer
 │
 ▼
UI
```

Do not allow:

```text
CMS
 ↓
arbitrary React code
```

or:

```text
Database
 ↓
eval()
```

---

# 41. Preview Architecture

Preview and production must use the same renderer.

Preferred:

```text
                 Renderer
                    │
          ┌─────────┴─────────┐
          │                   │
       Preview             Production
          │                   │
        Draft              Published
```

Do not maintain two independent rendering systems.

---

# 42. Caching Architecture

Public runtime should prefer:

```text
Browser
 ↓
CDN
 ↓
Next.js
 ↓
Published Snapshot
```

not:

```text
Every request
 ↓
Database
```

When content is published:

```text
Publish
 ↓
Invalidate Cache
 ↓
Revalidate
```

Cache invalidation must be explicit and predictable.

---

# 43. Database Migration Rules

Database changes must use versioned migrations.

Never manually alter production database schemas without recording the change in the migration system.

Before changing a schema:

1. Understand existing data.
2. Determine migration impact.
3. Update Prisma schema.
4. Generate migration.
5. Test migration.
6. Verify backward compatibility when required.

Never casually delete columns containing production data.

---

# 44. Dependency Rules

Before adding a package:

1. Check whether the functionality already exists.
2. Check maintenance status.
3. Check bundle impact.
4. Check security/reputation.
5. Check compatibility with the existing stack.

Do not add dependencies for trivial functionality.

---

# 45. Git Rules

Use small, focused commits.

Prefer:

```text
feat: add page revision model
feat: add hero component
feat: add page publishing
fix: invalidate page cache after publish
refactor: extract page repository
```

Avoid giant commits containing unrelated changes.

Never commit:

```text
.env
credentials
API keys
private certificates
database passwords
```

---

# 46. Environment Variables

Use environment variables for:

* Database URL
* Redis URL
* Authentication secrets
* Storage credentials
* External API keys
* Deployment configuration

Never hardcode secrets.

Maintain a documented example:

```text
.env.example
```

Never commit actual secret values.

---

# 47. Documentation

Important architectural decisions should be documented.

Use:

```text
docs/
├── architecture/
├── domain/
├── api/
├── database/
├── deployment/
└── decisions/
```

For significant decisions, use ADRs:

```text
ADR-001-use-postgresql
ADR-002-schema-driven-rendering
ADR-003-published-snapshots
ADR-004-multi-tenant-model
```

---

# 48. AI Coding Behavior

When modifying the codebase, you MUST first understand the existing architecture.

Before implementing a feature:

1. Inspect the relevant directory.
2. Identify existing patterns.
3. Reuse existing abstractions.
4. Check types and schemas.
5. Check database relationships.
6. Check tests.
7. Implement the smallest correct change.
8. Run relevant validation/tests.

Do not introduce a new architectural pattern when an existing pattern already solves the problem.

---

# 49. Do Not Rewrite Working Systems

Do not perform large rewrites unless explicitly requested.

If a feature can be implemented incrementally, prefer incremental changes.

Do not:

* Replace the database unnecessarily
* Replace the framework unnecessarily
* Rewrite working components
* Rename large portions of the project without reason
* Introduce a new state-management library without need

Preserve working behavior.

---

# 50. Feature Implementation Process

For every non-trivial feature:

```text
Understand
    ↓
Design
    ↓
Schema
    ↓
Domain
    ↓
Persistence
    ↓
API
    ↓
UI
    ↓
Tests
    ↓
Validation
```

Do not start by immediately editing UI files.

---

# 51. Definition of Done

A feature is not complete merely because the UI works.

Before considering a feature complete, verify:

* TypeScript passes
* Lint passes
* Relevant tests pass
* Database migration works if applicable
* Validation exists
* Authorization exists where applicable
* Error handling exists
* Responsive behavior works
* Accessibility is considered
* SEO is considered where applicable
* Cache behavior is correct
* No secrets are exposed
* No unnecessary dependencies were introduced
* Documentation is updated when architecture changed

---

# 52. Priority Order

When making engineering decisions, prioritize:

1. Correctness
2. Security
3. Maintainability
4. Architecture integrity
5. Performance
6. Accessibility
7. Developer experience
8. Convenience

Do not sacrifice architecture integrity for short-term implementation speed without explicit justification.

---

# 53. Golden Rule

The AIBOX Company Profile Platform should remain:

```text
Reusable
Composable
Configurable
Typed
Testable
Observable
Secure
Performant
Accessible
Versionable
Multi-tenant ready
```

The system should allow:

```text
New Company
     ↓
New Site Configuration
     ↓
New Theme
     ↓
New Content
     ↓
Same Engine
     ↓
New Company Profile
```

without copying or forking the application.

---

# 54. Final Engineering Principle

Always ask:

> "Am I building something specific to AIBOX, or am I building a capability of the Company Profile Engine?"

If the answer is:

```text
AIBOX-specific
```

keep it in configuration/content whenever possible.

If the answer is:

```text
Engine capability
```

implement it as a reusable, typed, tested platform capability.

The long-term goal is:

```text
                  COMPANY PROFILE ENGINE
                           │
          ┌────────────────┼────────────────┐
          │                │                │
        AIBOX           Company B        Company C
          │                │                │
       Content A        Content B        Content C
       Theme A          Theme B          Theme C
       Flow A           Flow B           Flow C
```

**One engine. Multiple companies. No codebase forks.**
