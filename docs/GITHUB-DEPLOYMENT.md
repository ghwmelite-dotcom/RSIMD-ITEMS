# GitHub to Cloudflare deployment

Workflow: `.github/workflows/deploy.yml` (Check and deploy).

Pull requests to main run migration policy tests, API tests, API TypeScript, frontend build/type checking and Worker dry-run, without production credentials. Pushes to main run the same checks, then deploy through the `production` GitHub environment. Actions are pinned to immutable commits; npm ci uses the dependency lockfile.

## Environment

GitHub Settings > Environments > production requires a main-only branch rule, the secret `CLOUDFLARE_API_TOKEN`, and variable `CLOUDFLARE_ACCOUNT_ID` set to the OHCS account. Ordinary automatic releases need no reviewer or wait timer. The workflow validates the account before deployment.

The token needs Cloudflare Pages Edit, Workers Scripts Edit and D1 Edit. Existing Worker bindings may require additional permissions; identify missing permissions from the failed Cloudflare API operation. Never put tokens into source or logs. Credentials are supplied only to Cloudflare steps.

## Release order

1. Test/build and upload the tested website as an Actions artifact.
2. Serialize production jobs; skip queued commits superseded on main.
3. Record a D1 Time Travel bookmark in the run summary.
4. Apply pending tracked migrations, then deploy the API.
5. Deploy the tested website artifact to the existing Pages project.
6. Check API health, assets, exact website commit, anonymous upload rejection and CORS.

The live checks use no credentials and write no maintenance data. Authenticated user journeys are not covered. Failures appear in Actions logs and the job summary. There is no automatic rollback: earlier migration/API steps can already be live when a later step fails.

## Migration tracking

`api/migrations` is the tracked directory. Historical `api/src/db/migration-*.sql` scripts were already applied and are excluded. `0001_existing_production_baseline.sql` checks existing tables/columns with read-only queries returning no rows. An incomplete schema fails. Wrangler records success in `d1_migrations`, preventing replay.

Keep applied migrations immutable. Add sequential files (`0002_description.sql`, etc.), test against the previous schema, and update the fresh-install schema separately. The migration checker conservatively allows additive table/index/column operations and rejects destructive/data-writing migrations. It is not a general-purpose SQL security parser. Destructive changes require a separately reviewed manual operation, recovery planning and compatible releases; do not weaken the guard to force them through.

This baseline targets the existing deployment. Provision new empty databases with `api/src/db/schema.sql` before applying it. CI never runs seed data against production.

## Operations and recovery

Push/merge reviewed changes to main and watch **Actions > Check and deploy**. Retry infrastructure failures with **Run workflow** on main or rerun failed jobs for the current main commit. Superseded commits are deliberately skipped.

Revert faulty application code on main to deploy a code rollback. Database changes are forward-only. Before using a Time Travel bookmark, review all subsequent writes that restoration would discard. Migrations, API and frontend must remain backward-compatible because deployment is sequential, not atomic.

References: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/) and [Pages CI uploads](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).
