import DefaultTheme from 'vitepress/theme';
import { inBrowser, useData, useRoute, type Theme } from 'vitepress';
import { h, nextTick, onMounted, watch } from 'vue';
import './custom.css';

/**
 * Draws ```mermaid blocks (emitted as <pre class="mermaid"> by the
 * markdown config) after each page renders, and again when the colour
 * scheme changes. Mermaid is loaded only on pages that have a diagram.
 */
async function renderMermaid(isDark: boolean): Promise<void> {
  if (!inBrowser) return;
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('pre.mermaid'));
  if (blocks.length === 0) return;

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    // diagrams come from our own docs, but keep mermaid's HTML sanitizing on
    securityLevel: 'strict',
  });

  for (const block of blocks) {
    // keep the source so the diagram can be redrawn in the other theme
    block.dataset.source ??= block.textContent ?? '';
    block.removeAttribute('data-processed');
    block.textContent = block.dataset.source;
  }
  await mermaid.run({ nodes: blocks });
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout);
  },
  setup() {
    const route = useRoute();
    const { isDark } = useData();
    const draw = () => nextTick(() => renderMermaid(isDark.value));
    onMounted(draw);
    watch(() => route.path, draw);
    watch(isDark, draw);
  },
} satisfies Theme;
