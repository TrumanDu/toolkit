/* eslint-disable no-underscore-dangle */
const baiduAnalyticsRenderer = (siteId: string, initCallback: any) => {
  if (!(siteId && typeof siteId === 'string')) {
    throw new TypeError(`require siteId`);
  }

  // 添加默认行为避免报错
  window._hmt = window._hmt || [];

  window.electron.ipcRenderer.on(
    'baidu-analytics-electron-reply',
    (_, { text }) => {
      window._hmt = window._hmt || [];

      if (initCallback && typeof initCallback === 'function') {
        initCallback(window._hmt);
      }

      const hm = document.createElement('script');
      hm.text = text;

      const head = document.getElementsByTagName('head')[0];
      head.appendChild(hm);
    },
  );

  window.electron.ipcRenderer.sendMessage(
    'baidu-analytics-electron-message',
    siteId,
  );
};

export default baiduAnalyticsRenderer;
