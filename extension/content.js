/* ============================================================
   SnipSage — Content Script
   Runs on all web pages to capture selections and show notifications.
   ============================================================ */

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selectedText = window.getSelection()?.toString() || '';
    sendResponse({
      text: selectedText,
      url: window.location.href,
      title: document.title,
    });
  }

  if (message.type === 'EXTRACT_FULL_PAGE') {
    const fullPageText = extractFullPageText();
    sendResponse({
      text: fullPageText,
      url: window.location.href,
      title: document.title,
    });
  }

  if (message.type === 'SNIPSAGE_SAVE_RESULT') {
    showNotification(message.success, message.message);
  }
});

/**
 * Extract clean readable text from the full page.
 * Strips scripts, styles, nav, footer, aside, and non-content elements.
 */
function extractFullPageText() {
  // Clone the body to avoid modifying the actual page
  const clone = document.body.cloneNode(true);

  // Remove non-content elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe',
    'nav', 'footer', 'header', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.cookie-banner', '.cookie-consent', '.ad', '.advertisement',
    '.sidebar', '.menu', '.nav', '.footer', '.header',
  ];

  removeSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Get the text content
  let text = clone.textContent || clone.innerText || '';

  // Clean up the text
  text = text
    .replace(/\t/g, ' ')                    // Replace tabs with spaces
    .replace(/[ ]{2,}/g, ' ')               // Collapse multiple spaces
    .replace(/\n\s*\n\s*\n/g, '\n\n')       // Collapse 3+ newlines to 2
    .replace(/^\s+/gm, '')                  // Remove leading whitespace per line
    .trim();

  return text;
}

/**
 * Show a toast notification on the page.
 */
function showNotification(success, message) {
  // Remove any existing notification
  const existing = document.getElementById('snipsage-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'snipsage-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      padding: 14px 22px;
      border-radius: 12px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background: ${success
        ? 'linear-gradient(135deg, #10B981, #059669)'
        : 'linear-gradient(135deg, #EF4444, #DC2626)'};
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: snipsageSlideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
    ">
      <span style="font-size: 18px;">${success ? '✨' : '❌'}</span>
      <span>${message}</span>
    </div>
    <style>
      @keyframes snipsageSlideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(notification);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s ease-out';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
