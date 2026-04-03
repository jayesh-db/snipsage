/* ============================================================
   SnipSage — Background Service Worker (Manifest V3)
   ============================================================ */

/**
 * API base URL — update SNIPSAGE_API_URL to your Vercel deployment URL.
 *
 * After your first Vercel deploy, replace the value below with:
 *   https://<your-project>.vercel.app/api
 *
 * For local development, temporarily change it to:
 *   http://localhost:3000/api
 */
const SNIPSAGE_API_URL = 'https://snipsage.vercel.app/api'; // ← UPDATE AFTER FIRST DEPLOY
const API_BASE = SNIPSAGE_API_URL;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'snipsage-save',
    title: 'Save to SnipSage',
    contexts: ['selection'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'snipsage-save' && info.selectionText) {
    const { token } = await chrome.storage.local.get('token');

    if (!token) {
      // Notify user to log in via badge
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);

      // Show toast notification on the page
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SNIPSAGE_SAVE_RESULT',
          success: false,
          message: 'Please click the extension icon to log in first.',
        }).catch(() => { });
      }

      return;
    }

    try {
      const payload = {
        text: info.selectionText,
        sourceUrl: tab?.url || 'unknown',
        pageTitle: tab?.title || 'Untitled Page',
        captureType: 'selection',
      };

      const response = await fetch(`${API_BASE}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        // Show success badge
        chrome.action.setBadgeText({ text: '✓' });
        chrome.action.setBadgeBackgroundColor({ color: '#10B981' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

        // Notify content script
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SNIPSAGE_SAVE_RESULT',
            success: true,
            message: 'Content saved to SnipSage!',
          }).catch(() => { });
        }
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('SnipSage save error:', error);
      chrome.action.setBadgeText({ text: '✗' });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    }
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'GET_SELECTION' },
          (response) => {
            sendResponse(response || { text: '', url: '', title: '' });
          }
        );
      } else {
        sendResponse({ text: '', url: '', title: '' });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'EXTRACT_FULL_PAGE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'EXTRACT_FULL_PAGE' },
          (response) => {
            sendResponse(response || { text: '', url: '', title: '' });
          }
        );
      } else {
        sendResponse({ text: '', url: '', title: '' });
      }
    });
    return true; // Keep message channel open for async response
  }
});
