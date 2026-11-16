# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Plan, based on the baseline test run (data 4/5 failing, API 4/4 failing, frontend 15/15 failing). Work test-first in small steps, one tier at a time, in the order data, logic, presentation. Add no authentication.

- Presentation tier decision: Keep pages in `frontend/src/components` and route all HTTP through the shared `src/api/client.ts` (relative `/api` paths, optional `VITE_API_BASE_URL`). Components only render. Each page shows a `role="status"` loading state, a meaningful empty state, and a `role="alert"` on API failure, then renders the data. The workouts page requests suggestions for a specific user email. Replace the "Implementation pending" placeholders last, one route at a time.
- Logic tier decision: Keep routes in `routes/api.ts` thin. Put validation and business rules in `services/octofitService.ts`, and have it throw errors carrying an HTTP `status` (400, 404). Handle those and Mongoose `ValidationError`/`CastError` in one error middleware so bad input never becomes a 500. Replace the `501` stubs.
- Data tier decision: Add `required` validators to the Mongoose models in `backend/src/models`: `User` (`name`, `email`, `fitnessGoal`), `Team` (`name`, `mascot`, `members` array of User refs), `Activity` (`user`, `team`, `type`, `minutes`, `points`, `occurredAt`) and `Workout` (`title`, `focus`, `minutes`, `difficulty`). Keep `src/scripts/seed.ts` idempotent and valid under the stricter schemas. Models hold no business logic.
- Activity tracking approach: `POST /api/activities` accepts `userId`, `teamId`, `type` and `minutes`. Check each ID with `isValidObjectId` and confirm the user and team exist, otherwise return a 4xx (400 for malformed IDs or minutes, 404 for a missing user or team). Compute `points` from `type` and `minutes`, set `occurredAt` to now, and store `user`, `team`, `type` and `minutes`. `GET` lists activities.
- Team management approach: `POST /api/teams` returns 400 when `name` is missing or blank and otherwise stores `name`, `mascot` and `members`. `GET` returns teams with `name`, `mascot` and members.
- Leaderboard approach: Use a Mongo aggregation that groups activities by team and sums `points`. Join to the team name, sort by `totalPoints` descending, and add a 1-based `rank`. Return `{ teamName, totalPoints, rank }` entries. Include teams with no activities (0 points) only if the tests require it.
- Workout suggestions approach: Look up the user by email and return 404 if none matches. Choose `focus` from the user's goal or their recent activity types. Return matching `Workout` documents, the best match first, each with a `reason` that names the activity or goal (for example, "Based on your recent run activity"). Return `[]`-safe results when there are no recent activities by falling back to the goal.

## Test plan

Run the tests after each step and stop at the first red one. Baseline on 2026-11-16: every suite fails except the seed idempotency test.

| Step | Command | Baseline failure and what it means |
| --- | --- | --- |
| 1. Data tier | `npm run test:data --prefix octofit-tracker/backend` | 4 of 5 fail. The models have no `required` validators, so `validateSync()` returns no errors for `User`, `Team`, `Activity` and `Workout`. The seed test passes and must stay green. |
| 2. Logic tier | `npm run test:api --prefix octofit-tracker/backend` | 4 of 4 fail. Activity and team creation are `501` stubs, the leaderboard returns `[]`, and workout suggestions lack a `reason`. Fixing a test here means the service or error handling is wrong, not the data tier. |
| 3. Backend build | `npm run build --prefix octofit-tracker/backend` | Type check and compile. Run after steps 1 and 2 are green. |
| 4. Presentation tier | `npm test --prefix octofit-tracker/frontend` | 15 of 15 fail. All four routes still render "Implementation pending", with no loading, empty or error states and no data. Mock `fetch` in these tests, so they need no backend. |
| 5. Frontend build | `npm run build --prefix octofit-tracker/frontend` | Type check and bundle. Run after step 4 is green. |

Order: finish and verify the data tier before the API, and the API before the frontend. Finish with all five commands passing. Confirm the services stay on MongoDB 27017, Express 8000 and Vite 5173.
