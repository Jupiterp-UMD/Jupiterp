import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isVercel = process.env.VERCEL === '1' || process.env.NOW_BUILDER === '1';

/**
 * GitHub Pages serves static files only, from a project subpath
 * (`/<repo>`), so that build is a client-rendered SPA: every route falls back
 * to `404.html`, which GitHub Pages serves for unknown paths.
 */
const isGhPages = process.env.GH_PAGES === '1';

function pickAdapter() {
  if (isGhPages) return adapterStatic({ fallback: '404.html', strict: false });
  if (isVercel) return adapterVercel();
  return adapterNode();
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: pickAdapter(),

    paths: {
      base: isGhPages ? (process.env.BASE_PATH ?? '/Jupiterp') : '',
    },

    prerender: {
      handleHttpError: 'warn',
      // Nothing is prerendered for Pages: the SPA fallback serves every route.
      ...(isGhPages && { entries: [] }),
    },
  },
};
export default config;
