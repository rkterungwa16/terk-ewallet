import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type DefaultTheme } from 'vitepress';

/**
 * The docs are written once, next to the code (backend/docs, frontend/docs
 * and the app READMEs). scripts/sync-docs.mjs copies them into src/ with the
 * same paths as the repository, so a page's path here is its path on
 * GitHub, and relative links between docs work in both places.
 */
const repoRoot = path.resolve(__dirname, '../..');
const GITHUB_REPO = 'https://github.com/rkterungwa16/terk-ewallet';
const GITHUB_BLOB = `${GITHUB_REPO}/blob/main`;

/** A page's first `# heading`, used as its sidebar label. */
function titleOf(file: string): string {
  const match = readFileSync(path.join(repoRoot, file), 'utf8').match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/`/g, '').trim() : path.basename(file, '.md');
}

function link(file: string): string {
  return '/' + file.replace(/\.md$/, '');
}

function item(file: string, text?: string): DefaultTheme.SidebarItem {
  return { text: text ?? titleOf(file), link: link(file) };
}

/** Every .md in `dir` except its README, sorted by file name (so 01-, 02-, ...). */
function pagesIn(dir: string): DefaultTheme.SidebarItem[] {
  const abs = path.join(repoRoot, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
    .map((name) => item(`${dir}/${name}`));
}

function group(text: string, dir: string, collapsed = false): DefaultTheme.SidebarItem {
  return {
    text,
    collapsed,
    items: [item(`${dir}/README.md`, 'Overview'), ...pagesIn(dir)],
  };
}

const backendSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Backend',
    items: [
      item('backend/README.md', 'Getting started'),
      item('backend/docs/architecture.md', 'Architecture'),
    ],
  },
  group('Performance decisions', 'backend/docs/performance'),
  group('Security decisions', 'backend/docs/security'),
];

const design = 'frontend/docs/design';
const frontendSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Frontend',
    items: [
      item('frontend/README.md', 'Getting started'),
      item('frontend/ARCHITECTURE.md', 'Architecture'),
      item(`${design}/README.md`, 'Design system'),
    ],
  },
  { text: 'Foundations', items: pagesIn(`${design}/foundations`) },
  { text: 'Layout', items: pagesIn(`${design}/layout`) },
  { text: 'Components', items: pagesIn(`${design}/components`) },
  { text: 'Patterns', items: pagesIn(`${design}/patterns`) },
];

export default defineConfig({
  title: 'Wallet docs',
  description: 'Architecture, performance, security and design documentation for the wallet.',
  lang: 'en',
  cleanUrls: true,
  lastUpdated: true,

  srcDir: 'src',

  vite: {
    // Mermaid and its diagram engines are large, but they're split out and
    // only loaded on pages that contain a diagram (see theme/index.ts).
    build: { chunkSizeWarningLimit: 2000 },
  },

  markdown: {
    config(md) {
      // Relative links to repository files that aren't pages (source files,
      // .env.example, ...) work on GitHub but not on this site: point them at
      // the file on GitHub instead. Links to .md pages are left to VitePress.
      md.core.ruler.push('repo_file_links', (state) => {
        const page: string | undefined = state.env?.relativePath;
        if (!page) return;
        const visit = (tokens: typeof state.tokens) => {
          for (const token of tokens) {
            if (token.children) visit(token.children);
            if (token.type !== 'link_open') continue;
            const href = token.attrGet('href');
            if (!href || /^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) continue;
            const [target] = href.split('#');
            if (/\.md$/i.test(target)) continue;
            const file = path.posix.normalize(path.posix.join(path.posix.dirname(page), target));
            if (file.startsWith('..')) continue;
            token.attrSet('href', `${GITHUB_BLOB}/${file}`);
          }
        };
        visit(state.tokens);
      });

      // ```mermaid blocks become <pre class="mermaid">, drawn in the browser
      // by the theme (see theme/index.ts). v-pre stops Vue reading {{ }}.
      const fence = md.renderer.rules.fence!;
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        if (token.info.trim() === 'mermaid') {
          return `<pre class="mermaid" v-pre>${md.utils.escapeHtml(token.content)}</pre>`;
        }
        return fence(tokens, idx, options, env, self);
      };

      // The docs are written for GitHub, where `style={{ ... }}` is just
      // text. Vue would read {{ }} in inline code as a template expression,
      // so mark inline code v-pre (fenced code blocks already are).
      const codeInline = md.renderer.rules.code_inline!;
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
        codeInline(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre');
    },
  },

  themeConfig: {
    nav: [
      { text: 'Backend', link: '/backend/docs/architecture', activeMatch: '^/backend/' },
      { text: 'Frontend', link: '/frontend/ARCHITECTURE', activeMatch: '^/frontend/' },
    ],
    sidebar: {
      '/backend/': backendSidebar,
      '/frontend/': frontendSidebar,
    },
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: GITHUB_REPO }],
    editLink: {
      pattern: `${GITHUB_REPO}/edit/main/:path`,
      text: 'Edit this page on GitHub',
    },
  },
});
