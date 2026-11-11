import { defineConfig } from 'vite';
import { renderHead, renderPage } from './src/render-page.js';
import { localeFromPath } from './src/content.js';

export default defineConfig({
  publicDir: 'site-assets',
  optimizeDeps: { entries: ['index.html'] },
  plugins: [{
    name: 'dar-locales',
    transformIndexHtml(html, context) {
      const locale = localeFromPath(context.originalUrl ?? '/');
      return html
        .replace('<html lang="en">', '<html lang="' + locale + '" dir="' + (locale === 'ar' ? 'rtl' : 'ltr') + '">')
        .replace('<!-- DAR HEAD -->', '<!-- DAR HEAD -->' + renderHead(locale) + '<!-- /DAR HEAD -->')
        .replace('<!-- DAR PAGE -->', '<!-- DAR PAGE -->' + renderPage(locale) + '<!-- /DAR PAGE -->');
    },
  }],
});
