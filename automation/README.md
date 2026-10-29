# Ministry -> Notion (preview)

Government RSS discovery -> read official source article -> AI summary -> Notion database page.

## Status
Prototype on a feature branch. GitHub Actions is **manual-only** and defaults to dry run.
No Notion integration secrets or Notion target database have been configured by this change.
DO NOT enable cron until test results, source usage terms, and Notion structure are checked.

## Verified RSS endpoints
- [Cabinet Office](https://www.cao.go.jp/rss/) : https://www.cao.go.jp/rss/news.rdf
- [Digital Agency](https://www.digital.go.jp/rss) : https://www.digital.go.jp/rss/news.xml

Ministry of Economy, Trade and Industry, Ministry of Finance, MLIT etc. can be added after verifying the exact feed URL and page extraction. Do not invent API endpoints.

## Notion setup
1. Create a dedicated full-page database with a title property named `Name`.
2. Create a Notion integration and grant it access to this database.
3. In GitHub repository settings > Secrets and variables > Actions, set:
   - `NOTION_TOKEN` (secret)
   - `NOTION_DATA_SOURCE_ID` (secret; data source ID, not database ID)
   - `ANTHROPIC_API_KEY` (secret)
   - `ANTHROPIC_MODEL` (variable; choose a model ID supported by your account)
4. Run workflow_dispatch with dry_run=true and inspect logs.
5. Test with dry_run=false using a small MAX_ITEMS_PER_RUN value, after validating sources and rights.
6. Only then enable the scheduled trigger. Actions schedules are not exact-time guarantees.

## Current limitations / safeguards
- Uses full page title for deduplication; for production use canonical URL identifier or stable hash property.
- RSS article release date may not be present; unknown is stored explicitly.
- Only basic HTML text extraction; PDF and JavaScript-generated pages are skipped.
- Individual failed items logged; feed failures do not stop remaining sources.
- This code does not guarantee complete capture of every agency notice.
- It does not trade securities or create financial recommendations.
- Respect source site usage conditions, rate limits and redistribution restrictions before enabling automation.
