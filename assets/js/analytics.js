// Preview and development visits must not enter the production GA4 property.
(() => {
  if (location.protocol !== 'https:' || !['roomjurmala.lv', 'www.roomjurmala.lv'].includes(location.hostname)) return;
  const id = 'G-QLD7392ML2';
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.append(script);
})();
