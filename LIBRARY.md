# MediAI library

The public `/library` page is a curated, searchable directory of 11 external health resources. Searches run in the browser and do not transmit the search text. Records live in `frontend/src/data/library.json`; English and Polish keywords are supported. Links were checked on 9 October 2026. This is a link check, not a clinical review.

The backend endpoint `GET /api/library/search?q=first%20aid&limit=5` searches the same metadata, with optional `category`. It returns `scope: link_metadata_only`. Render now builds this repository, branch `codex/mediai-recovery`, root `backend`. Keep `backend/library.json` in sync with the frontend catalogue: Render's backend root cannot access frontend files.

## Agent access and limits

The chat matches each new message against catalogue titles and keywords and supplies up to three relevant record descriptions and publisher URLs to its existing AI provider. The response stores these records in `further_reading`; the frontend displays them separately from evidence citations. The agent is instructed that these are metadata, not retrieved articles or verification of its answer. Empty results do not assess health or establish safety. No full article ingestion or source-grounded answer generation is implemented.

Before adding article retrieval, check the licence of each document for commercial use and AI processing, retain attribution and review dates, and add clinical review and tests for incorrect citations and emergency handling. NICE content is not included for AI ingestion; its general open-content licence excludes AI use. PMC licences vary per article. Do not copy entire publisher websites.

## UK release

The landing page and library describe educational use and direct users to professional care. A disclaimer does not itself establish that software is outside medical-device regulation. Before selling, assess the actual functions and intended purpose with a qualified UK regulatory adviser, and review privacy, health-data processing and consumer terms. This document and the in-app notice are not legal clearance.

## Validation

Catalogue search was checked for Polish keywords, no matches, category filtering, limits, unique IDs and total records. Chat matching was checked for English and Polish topic questions, unknown topics, generic pain, the result limit and metadata-only scope. The Render build runs matching checks and a Groq response smoke test without user data. Frontend compilation is verified through Vercel; the authenticated rendering of further-reading cards requires confirmation from a signed-in user.
