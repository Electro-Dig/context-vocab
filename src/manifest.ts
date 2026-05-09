import type { ManifestV3Export } from '@crxjs/vite-plugin';

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'Context Vocab',
  description: 'Select words, understand them in context, and meet them again across the web.',
  version: '0.1.0',
  icons: {
    16: 'assets/icons/icon-16.png',
    32: 'assets/icons/icon-32.png',
    48: 'assets/icons/icon-48.png',
    128: 'assets/icons/icon-128.png'
  },
  action: {
    default_icon: {
      16: 'assets/icons/icon-16.png',
      32: 'assets/icons/icon-32.png',
      48: 'assets/icons/icon-48.png',
      128: 'assets/icons/icon-128.png'
    },
    default_popup: 'src/popup/index.html',
    default_title: 'Context Vocab'
  },
  options_page: 'src/options/index.html',
  permissions: ['storage', 'activeTab'],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      css: ['src/content/content.css'],
      run_at: 'document_idle'
    }
  ]
};

export default manifest;
