# Personalized GTM strategy and research evidence

Each new company report includes a go-to-market strategy based on its product description, audience, region, pricing, founder testimony and retrieved evidence. The founder can supply a monthly budget and currency, total team hours per week, team size, a 30-, 60- or 90-day horizon, existing assets and channel restrictions. An unknown budget differs from a zero budget.

The strategy proposes a first buyer, positioning, buying process, ranked channels, first actions, success signals, stop rules and a launch sequence. These are recommendations and proposed tests. They are not measured traction, proven demand or revenue forecasts. Missing context stays in the assumptions.

Strategies live in the existing report record. Old reports remain readable and can generate a strategy through section refresh. Refresh saves the previous inputs, content and source snapshots. Refreshing a report with a strategy regenerates that strategy so it does not silently retain advice based on earlier content. Existing completed first-week tasks remain unchanged.

## Research coverage

The crawl reads the company website, up to three competitor URLs and up to six supplied reference URLs. It rotates across roots before traversing relevant links, with limits of 24 receipts, 32 fetch attempts and a 45-second check between requests. Individual requests retain their timeout and byte limits. Sources remain subject to public-IP, redirect and content-type protections.

This is a bounded source crawl. It does not perform general web search, render JavaScript or read PDF documents. Supplying a reference does not make its publisher independent. Failed receipts have an empty excerpt and an unavailable status. A failed receipt never supports a fact. Page counts describe coverage, not validation.

Research uses the fetched source snapshots. It does not replace those excerpts with later page contents during synthesis. Source records expose excerpts, retrieval dates, roles, availability and content hashes where recorded. A retrieval date is not a publication date.

## Evidence checks

Factual claims require a matching quotation in each retained citation. Numeric facts must copy a sentence or clause verbatim, preserving the amount, subject, currency, scale, sign and period together. Numeric paraphrases become interpretations. Missing excerpts fail closed. Unsupported facts become low-confidence interpretations with no factual citations.

The research data section retains only data points whose literal value, unit words, scope and stated period match the quoted excerpt. A missing period is shown as unknown. Published prices do not demonstrate purchases. Vendor case studies remain vendor-reported outcomes. Derived ROI, estimated market sizes and proposed targets must not appear as observed measurements.

These checks establish quotation provenance. They do not establish truth, independence, statistical validity or semantic entailment. The report must retain caveats and the original quote so the founder can inspect the context.

The backend caps total proposed channel spending and hours at supplied limits and constrains phase dates to the planning horizon. If it adjusts a generated allocation or phase, it records a warning to review the actions before committing. All proposed spending uses the founder's selected currency. Unknown limits require explicit assumptions.

Report-to-experiment conversion retains the verified quotation and source content hash. Unsupported citations do not become experiment evidence.

## Verification commands

Run the backend tests from `backend` with `.venv/Scripts/python.exe -m pytest`. Run TypeScript, lint, the production build and the GTM browser tests from `frontend`. The new tests cover numeric mismatches, missing excerpts, citation filtering, measured-data provenance, resource limits, persistence, refresh snapshots and legacy reports. Browser checks cover the input form and saved strategy on phone and desktop.
