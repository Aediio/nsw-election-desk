# Optional Gemini setup

Open Settings → AI / Gemini. Paste the key locally, enter gemini-3.8-flash or another model ID, enable AI, select Save / Update, then Test connection. Your partner repeats this on their browser/device. Remove API key deletes the separate device configuration. The saved key is never displayed in full; the input clears after saving.

The key is intentionally stored in browser localStorage, readable by someone with access to that browser's storage. It is never automatically synced, committed, exported with learning progress, put in a URL or sent to GitHub Actions. Do not paste real keys into issue reports or screenshots. No backend is added to conceal it.

`src/gemini.js` centralizes all calls. It sends the key in the `x-goog-api-key` header to Google's models and generateContent endpoints only when you invoke Test, a learning explanation or Research. Research requests Google Search grounding; returned grounding links are displayed as citations. Unsupported models/search, key rejection, quota, timeouts and network outages produce readable errors. A successful test verifies the selected model, not the truth of AI output.

Learning explanations receive the approved card, not private notes or the whole progress database. General research sends the text you enter. Treat results as temporary research: verify sources and propose changes through review. AI never changes canonical data or ordinary quiz answers. Without a key, all core learning remains available.

References: [Gemini API authentication](https://ai.google.dev/api), [generateContent](https://ai.google.dev/api/generate-content), [Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search). Load available models uses [models.list](https://ai.google.dev/api/models) independently of the generation test, so models remain selectable even when generation fails. A custom model ID is supported. Test connection uses the saved model exactly without switching or replacing it. Only the explicit `auto` choice discovers a Flash model. Google error messages are displayed with the API key redacted and the HTTP status and attempted model identified. HTTP 429 can reflect a model/project rate limit or zero allowance; check the same project's rate-limit page, not only aggregate usage. No billing settings are changed automatically.


Automated tests use a clearly fake placeholder with mocked fetch responses. No real key was supplied for end-to-end live Gemini validation. No hosted AI secret is configured. A future proxy or scheduled AI workflow would require an explicit separate design and authorization.
