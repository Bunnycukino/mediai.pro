# MediAI library

The public `/library` page is a curated, searchable directory of 11 external health resources. Searches run in the browser and do not transmit the search text. Records live in `frontend/src/data/library.json`; English and Polish keywords are supported. Links were checked on 9 October 2026. This is a link check, not a clinical review.

The prepared backend endpoint `GET /api/library/search?q=first%20aid&limit=5` searches the same metadata, with optional `category`. It returns `scope: link_metadata_only`. The endpoint is available only after deploying this backend. The existing Render service has not been migrated to this repository. Keep `backend/library.json` in sync with the frontend catalogue: Render's backend root cannot access frontend files.

## Agent access and limits

The current chat does not automatically retrieve library articles. An agent consuming the catalogue must label results as **further reading**, not evidence consulted to produce an answer. Empty results do not assess health or establish safety. No full article ingestion or source-grounded answer generation is implemented.

Before adding article retrieval, check the licence of each document for commercial use and AI processing, retain attribution and review dates, and add clinical review and tests for incorrect citations and emergency handling. NICE content is not included for AI ingestion; its general open-content licence excludes AI use. PMC licences vary per article. Do not copy entire publisher websites.

## UK release

The landing page and library describe educational use and direct users to professional care. A disclaimer does not itself establish that software is outside medical-device regulation. Before selling, assess the actual functions and intended purpose with a qualified UK regulatory adviser, and review privacy, health-data processing and consumer terms. This document and the in-app notice are not legal clearance.

## Validation

Catalogue search was checked for Polish keywords, no matches, category filtering, limits, unique IDs and total records. The FastAPI integration needs deployment validation. Frontend compilation and browser behaviour are verified through the Vercel deployment.
