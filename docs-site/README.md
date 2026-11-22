# Wallet docs site

A [VitePress](https://vitepress.dev) site that publishes the repository's
documentation: the backend README, architecture, performance and security
records, and the frontend README, architecture and design system.

The markdown isn't kept here. It stays next to the code it describes, and
`scripts/sync-docs.mjs` copies it into `src/` (gitignored) before every
build, with the same paths as the repository. So:

- **To change a page, edit the file in `backend/` or `frontend/`**, never
  the copy in `src/`. Each page's "Edit this page on GitHub" link opens the
  real file.
- Relative links between docs work both on GitHub and on the site.
- Links to files that aren't pages (source files, `.env.example`) open the
  file on GitHub.
- Only `src/index.md` (the homepage) lives here.

## Adding a page

Put the markdown under `backend/docs/` or `frontend/docs/design/`. Pages in
`backend/docs/performance`, `backend/docs/security` and the design-system
folders appear in the sidebar automatically, ordered by file name and
labelled with their first `# heading`. Anything else needs an entry in
`.vitepress/config.mts`. A new top-level source (another folder or README)
also needs adding to `SOURCES` in `scripts/sync-docs.mjs`.

`mermaid` code blocks render as diagrams. Inline code is shown literally,
so `style={{ ... }}` is safe to write.

Watch for one Markdown trap: a line that *starts* with `<Something>` is
read as raw HTML and breaks the build. Keep generic types such as
`FormState<TValues>` inside a single code span on one line.

## Running locally

Requires Node 20.19 or newer.

```bash
cd docs-site
npm install
npm run dev
```

`npm run dev` syncs once at startup. After editing a doc, restart it (or
run `npm run sync`) to see the change.

```bash
npm run build     # sync + static build into .vitepress/dist
npm run preview   # serve the built site on http://localhost:4173
```

## Deploying on Vercel

The site is its own Vercel project, separate from the wallet frontend.

1. In Vercel, **Add New… → Project** and import
   `rkterungwa16/terk-ewallet` again.
2. Set **Root Directory** to `docs-site`. Leave "Include files outside the
   root directory in the Build Step" enabled (the default): the build reads
   `../backend` and `../frontend`.
3. The framework, install and build commands and the output directory come
   from `vercel.json`. No environment variables are needed.
4. Deploy. Pushes to `main` redeploy the site, and pull requests get
   preview URLs, like the frontend project.

Docs changes under `backend/` or `frontend/` also trigger a docs rebuild.
To skip docs builds for unrelated changes, set the project's **Ignored
Build Step** to:

```bash
git diff --quiet HEAD^ HEAD -- docs-site backend/docs backend/README.md frontend/docs frontend/README.md frontend/ARCHITECTURE.md
```

## Dependencies

`npm audit` reports a moderate advisory in esbuild, through VitePress 1.x's
Vite. It affects only the local dev server (`npm run dev`), not the static
site, and VitePress 1.x has no fixed release. Don't expose the dev server
beyond your own machine.
