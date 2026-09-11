# Ledgerly - Project Context and Engineering Rules

## Project overview

Ledgerly is a personal monthly financial-tracking application. It is a monorepo composed of:

- `frontend/`: Angular 22 standalone application.
- `backend/`: Express 5 API written in TypeScript.
- `prisma/`: PostgreSQL schema and migrations managed by Prisma 6.
- `render.yaml`: Render deployment configuration.

The application manages monthly salary, mandatory expenses, pleasure expenses, variable expenses, investments, recurring entries, imports between months, transactions, authentication, and savings goals.

## Technology baseline

### Frontend

- Angular `22.0.0`.
- Standalone components and lazy-loaded routes.
- Signals and computed signals for component state and derived state.
- `ChangeDetectionStrategy.OnPush` on every component.
- Zoneless change detection through `provideZonelessChangeDetection()`.
- Template-driven forms with `FormsModule` are intentional and must be preserved.
- SCSS for styling.
- Chart.js for the budget chart.
- Lucide Angular for interface icons when an icon is needed.
- Angular Router for navigation.
- Angular HttpClient for API calls.

### Backend

- Node.js 22.
- Express 5.
- TypeScript.
- Prisma 6 with PostgreSQL.
- Zod for request validation.
- JWT and bcryptjs for authentication.
- Nodemailer for transactional email.

## Async and RxJS policy

The application code is Promise-first.

- Do not add `subscribe()` anywhere in application code.
- Do not expose `Observable<T>` from services, components, guards, or page APIs.
- Use `async`/`await`, `try`/`catch`, and `finally` for asynchronous control flow.
- Service methods must return `Promise<T>`.
- Angular `HttpClient` internally returns Observables, so services must convert the response immediately with `firstValueFrom`.
- `firstValueFrom` is the preferred and only normal RxJS bridge in services.
- RxJS must remain a minimal implementation detail, not an application-level programming model.
- The Angular `HttpInterceptorFn` pipeline is an intentional exception: Angular's interceptor contract is Observable-based. Keep the authentication interceptor small and do not introduce RxJS operators unless strictly required.
- Do not replace the HTTP interceptor with an improvised Promise abstraction that breaks Angular's `HttpClient` contract.
- When starting asynchronous work from a constructor or a synchronous template handler, call the async method with `void method()` and handle errors inside that method.
- Do not leave unhandled Promise rejections.

## Function documentation policy

Every function without exception must have a detailed docblock immediately above it.

This includes:

- constructors;
- public, protected, and private methods;
- standalone functions;
- arrow functions assigned to fields;
- computed signal callbacks when they represent non-trivial behavior;
- HTTP, router, form, chart, and event callbacks;
- test callbacks when tests are edited.

Each docblock must contain:

- a concise explanation of what the function does;
- `@param` for every parameter;
- `@returns` with the exact return type and a short description of the returned value or side effect.

Use explicit return types on functions and methods. Prefer `Promise<void>` for asynchronous side-effect methods and `Promise<T>` for asynchronous data methods. Keep one blank line between methods and between logical blocks so TypeScript remains airy and easy to scan.

Do not add comments that merely restate a line of code. Comments should explain intent, side effects, domain behavior, or a non-obvious technical constraint.

## Angular architecture rules

- Keep components standalone and lazy-load pages through the router.
- Keep shared authenticated shell behavior in `AppLayoutComponent`.
- Keep page-specific behavior in the page that owns it.
- Keep reusable UI behavior in focused components such as `ExpenseSection`, `ExpenseForm`, and `BudgetChart`.
- Keep API contracts and HTTP conversion in services, not in templates.
- Use signals for mutable UI state and `computed` for derived state.
- Do not reintroduce zone-based change detection.
- Use `OnPush` consistently.
- Keep public APIs and service contracts strongly typed.
- Preserve the existing template-driven form approach unless a future request explicitly asks for Reactive Forms.

### Angular component rules

- Prefer `inject()` for dependency injection, matching the existing standalone component style.
- Keep components focused on presentation, user interaction, and local view state.
- Keep HTTP calls, response mapping, and API contracts in services.
- Keep domain calculations in the page or a focused domain helper; do not bury business rules in templates.
- Use `input()`, `output()`, and `model()` for modern component APIs when appropriate.
- Prefer `readonly` signals and readonly injected dependencies whenever a value is not reassigned.
- Use `computed()` for pure derived state. Computed callbacks must not perform HTTP calls or mutate signals.
- Use `effect()` only for genuine side effects such as synchronizing a theme or integrating with an imperative library. Do not use effects to propagate state that can be represented by `computed()`.
- Do not mutate arrays or objects held in signals in place. Use `set()` or `update()` with new values.
- Start asynchronous work from constructors or synchronous template handlers with `void method()` and handle errors inside the called method.
- Do not use `setTimeout` as a change-detection workaround. Fix the signal, lifecycle, or integration boundary instead.
- Use Angular Router navigation APIs instead of manually changing `window.location` for application navigation.
- Keep lazy routes isolated and load page components only when their route is requested.

### Angular template rules

- Prefer Angular control flow (`@if`, `@for`, `@switch`) and always provide a stable `track` expression for repeated collections.
- Keep templates declarative and readable; move transformations, filtering, formatting, and branching logic into typed component members.
- Do not call methods that perform side effects from templates.
- Avoid expensive repeated calculations in templates; use signals or `computed()` for derived values.
- Use semantic HTML elements, associated labels, keyboard-accessible controls, and meaningful ARIA attributes where needed.
- Preserve visible focus states and do not remove native focus outlines without providing an equivalent accessible state.
- Buttons must have explicit `type` values when they are inside forms.
- Display asynchronous errors in the UI with a clear recovery path and do not silently swallow failures.
- Keep user-facing copy in French when working in existing Ledgerly screens.

### Angular forms and HTTP rules

- Preserve template-driven forms and `FormsModule`; do not migrate to Reactive Forms without an explicit request.
- Keep form state typed and validate required, numeric, and domain constraints before making an API call.
- Disable or guard submit actions while a request is pending to prevent duplicate writes.
- Use `HttpClient` only inside services. Convert each request immediately with `firstValueFrom` and expose `Promise<T>`.
- Type every HTTP response explicitly; never allow `unknown` or `any` to leak into page code.
- Keep the bearer-token interceptor small and synchronous apart from Angular's required HTTP pipeline contract.
- Do not add RxJS operators, subjects, application-level streams, or subscriptions unless Angular requires them at an integration boundary.

### Angular performance rules

- Keep `OnPush` and zoneless change detection enabled for every component.
- Prefer signals over manual change-detection calls.
- Avoid unnecessary object and array creation inside templates.
- Destroy or clean up imperative resources such as Chart.js instances in the appropriate lifecycle hook.
- Keep initial bundles small through lazy routes and avoid importing large libraries into shared code when a focused import is available.
- Do not add `ChangeDetectorRef.detectChanges()` to compensate for incorrect state ownership.

## Styling and SCSS architecture

- `frontend/src/styles.scss` is for genuinely global styles, design tokens, resets, themes, and shared utilities.
- Each component owns its local stylesheet through Angular `styleUrl` and a neighboring `.scss` file.
- Page-specific styles belong to the page stylesheet.
- Shared authenticated shell styles belong to `app-layout.scss`.
- Do not duplicate shared styles across components.
- Keep `app.scss` small; it must not become a second global stylesheet or a monolithic page stylesheet.
- Preserve responsive behavior and light/dark theme behavior when moving styles.
- Avoid unrelated visual redesign during architectural refactors.

### Styling rules

- Use the existing visual language, typography, spacing, color tokens, responsive behavior, and light/dark themes unless a redesign is requested.
- Prefer CSS custom properties for values shared across global styles or multiple components.
- Keep selectors shallow and component-scoped. Avoid broad selectors such as `button`, `input`, or `section` in component styles unless they are intentionally scoped below the component host.
- Use `:host`, `:host(...)`, and `:host-context(...)` deliberately when a component's host state or theme controls its appearance.
- Do not rely on `!important` for normal component styling. If a global rule requires an exception, fix the global cascade first or scope the exception narrowly.
- Do not duplicate form-control, button, or sector styles across pages. Put reusable rules in a shared stylesheet and component-specific rules next to the component.
- Preserve stable dimensions and responsive constraints so text, validation messages, and loading states do not shift layouts.
- Check both dark and light themes and mobile breakpoints after changing shared styles.
- Keep SCSS formatted with Prettier and avoid unrelated formatting churn.

## TypeScript and JavaScript rules

- Keep TypeScript strict. Do not weaken `strict`, introduce `any`, or add broad type assertions to silence compiler errors.
- Prefer discriminated unions, explicit interfaces, and domain types over duplicated inline object shapes when a contract is reused.
- Use `unknown` for external errors and narrow them before reading properties. Do not assume caught values are `Error` or an HTTP error shape.
- Give every function and method an explicit return type.
- Prefer small pure functions for parsing, mapping, formatting, and validation.
- Avoid hidden mutation, implicit global state, and magic strings for domain values.
- Use descriptive names; do not use one-letter variables outside conventional callback parameters where the meaning is obvious.
- Keep imports ordered and remove unused imports before validation.
- Use `const` by default and `let` only when reassignment is required.
- Do not use non-null assertions when a real guard or validation can express the invariant.
- Use `Date` and timezone handling deliberately for monthly financial data; preserve the `YYYY-MM` API convention.
- Do not log tokens, passwords, full authorization headers, or sensitive personal financial data.

## Express and Node.js backend rules

- Keep the backend ESM configuration and explicit `.js` import suffixes in source imports.
- Keep route modules focused on HTTP orchestration. Put reusable validation, authentication, token, mail, and persistence concerns in dedicated modules.
- Validate every external input with Zod before using it. Never trust route params, query strings, headers, or JSON bodies.
- Return consistent JSON error shapes and appropriate HTTP status codes. Do not expose stack traces, SQL details, JWT internals, or secrets to clients.
- Use centralized error handling for unexpected Express errors and keep expected validation/authentication errors explicit.
- Keep authentication middleware before protected route handlers and derive the user identity only from a verified JWT subject.
- Scope every authenticated database query by the authenticated user ID. Never trust a client-provided owner ID.
- Configure CORS from validated environment configuration. Do not use wildcard origins for authenticated requests.
- Keep `express.json()` limits intentional and avoid accepting unnecessarily large request bodies.
- Do not block the event loop with synchronous filesystem, crypto, or CPU-heavy work in request handlers.
- Await asynchronous route work and ensure rejected promises reach the Express error boundary.
- Keep startup configuration validation early and fail fast when required environment variables are invalid.
- Use structured, useful logs without secrets. Include operation context and status where it helps diagnosis.
- Keep health checks lightweight and avoid making them depend on nonessential external services.

## Authentication and security rules

- Hash passwords with the existing bcryptjs flow; never store or log plaintext passwords.
- Keep JWT secrets in environment variables and require the configured minimum length.
- Keep access tokens in the existing `ledgerly_token` contract unless a migration is explicitly requested.
- Validate token presence, signature, expiration, and subject before attaching identity to a request.
- Apply authorization at the data-access boundary, not only in the UI.
- Escape or safely parameterize all user-controlled output. Never build SQL strings from request data.
- Treat email verification and password-reset tokens as sensitive, short-lived credentials.
- Do not commit `.env` files, credentials, generated secrets, database dumps, or production data.
- Review dependency changes for necessity and security impact before adding packages.

## Prisma and database rules

- Use the generated Prisma client through the existing project utility rather than creating ad hoc clients per request.
- Keep schema changes in Prisma migrations; do not edit an already-applied migration to change production behavior.
- Run Prisma validation/generation when the schema or generated client contract changes.
- Use transactions for multi-step writes that must succeed or fail together.
- Scope reads and writes by user and month where the domain requires it.
- Preserve unique constraints and handle known Prisma constraint failures as user-facing domain errors.
- Avoid unbounded relation loading and select only the fields required by the API response.
- Keep monetary values precise at persistence boundaries and convert them deliberately for API/UI contracts.
- Do not expose raw Prisma model objects when a stable API response shape is more appropriate.

## API contract rules

- Keep frontend service types aligned with backend response schemas.
- Version API paths through the configured `/api/v1` base URL.
- Use nouns and predictable HTTP verbs/status codes for resources.
- Validate and normalize enum values at the API boundary; keep frontend display labels separate from persisted enum codes.
- Keep error codes stable and machine-readable while returning French user-facing messages in the UI.
- Update the relevant frontend service types, backend validation, and documentation together when an API contract changes.

## Testing and review rules

- Do not remove or weaken existing tests. Add tests when explicitly requested or when a change introduces meaningful shared behavior or security risk.
- Prefer focused unit tests for pure mapping, validation, calculations, guards, and services.
- Cover success, validation failure, authorization failure, network failure, and duplicate-write paths for important flows.
- Keep tests deterministic and independent of real production databases, mail providers, or external services.
- For UI changes, verify both responsive breakpoints and light/dark themes when practical.
- Before finishing a change, review the diff for accidental formatting churn, debug logs, secrets, dead code, and unrelated edits.

## Documentation rules

- Keep user-facing documentation and product copy in French when matching Ledgerly's existing language.
- Keep source identifiers, type names, and docblocks in clear English unless surrounding code establishes another convention.
- Update README or relevant docs when setup commands, environment variables, API contracts, or architecture change.
- Document non-obvious constraints and exceptions, especially the Angular interceptor RxJS boundary and financial date/precision behavior.

## Code quality rules

- Make the smallest focused change that solves the request.
- Preserve existing public behavior and API shapes unless the request requires a contract change.
- Prefer existing project patterns over new abstractions.
- Use explicit domain types instead of `any`.
- Avoid one-letter variable names.
- Do not add unnecessary dependencies.
- Do not add inline comments unless they document a non-obvious block.
- Keep formatting consistent with Prettier.
- Do not commit, reset, or revert user changes unless explicitly requested.
- Do not fix unrelated bugs while working on a focused request.

## Validation commands

From the repository root:

```powershell
npm run build:frontend
npm run build:backend
npm run typecheck
```

For frontend-only changes:

```powershell
Push-Location frontend
npx prettier --write <changed-files>
npm run build
Pop-Location
```

For backend-only changes:

```powershell
Push-Location backend
npm run typecheck
npm run build
Pop-Location
```

Always run the narrowest relevant validation after editing, then run the broader build when the change crosses module boundaries.

## Repository conventions

- Use forward-slash paths in documentation.
- Keep documentation and user-facing copy in French when matching the existing product language.
- Keep source code identifiers and docblocks in clear English unless the surrounding file establishes another convention.
- Do not add new tests unless requested, but never weaken or remove existing tests.
- The frontend and backend communicate through the versioned API base URL configured in `frontend/src/environments/environment.ts`.
- Authentication uses the `ledgerly_token` local-storage key and a bearer token interceptor.
