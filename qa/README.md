# Family QA registry

`sites.json` is the source of truth for the apex site and 17 canonical
subdomains. It records each domain, canonical repository, deployment artifact,
build and validation commands, route seeds, application-state enumerator, and
permitted external services. The three named duplicate directories are
deliberately excluded. Registry validation also resolves every registered
package script and Node entry point so stale QA commands fail before a crawl.

`content-books.json` drives cross-book metadata, completeness, privacy, and
Scripture-reference checks. Philippians 4 is structurally validated but is
always excluded from editorial and theological certification, even when the
user has populated its fields.

`review-policy.json` records the review hierarchy and the doctrinal regression
areas. Scripture is primary. The current 28 Fundamental Beliefs and the voted
Methods of Bible Study are the denominational and interpretive baselines;
official GC/BRI material and Adventist commentary are supporting evidence.
Private research evidence must never be copied into a public artifact.

`deck-screenshots.json` is the reproducible screenshot manifest. Capture every
listed live landing page after deployment at a 1280×720 browser viewport,
review the full frame and the 340×188 top-centered card crop, then store the PNG at
the listed path. Run `npm run qa:screenshots` to verify coverage, dimensions,
hashability, and card references.

Generated crawl and browser ledgers belong in `qa-results/` and are intentionally
ignored. Forms and donation links are checked for validation and reachability
without submitting data or money.

`browser-checks.json` defines the rendered desktop/mobile checks and the manual
keyboard/focus matrix used after deployment. Browser results are written to the
ignored `qa-results/` working directory; the final, non-sensitive totals and
exceptions are copied into the committed audit ledger.
