# My Bible Explorer

Static hub for mybibleexplorer.com.

This site is the central library home for the My Bible Explorer subdomain family.

## Family QA

The `qa/sites.json` registry is the source of truth for the apex site and its 17
canonical study subdomains. The audit scripts inventory local static routes and
application states, validate local links and fragments, and smoke-test the live
HTTPS sites without submitting forms or donation data.

Run `npm run check` for the local registry, inventory, link, screenshot,
structured-content, theology-policy, and placeholder gates. Run
`npm run qa:production` after deployment for the HTTPS crawl. Generated reports
and browser ledgers are written to `qa-results/` and are not committed. See
`qa/README.md` for scope, review controls, and the reproducible deck-capture
procedure.
