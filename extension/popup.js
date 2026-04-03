/* ============================================================
   SnipSage Extension Popup — Logic
   ============================================================ */

const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const authSection = document.getElementById('authSection');
const captureSection = document.getElementById('captureSection');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');
const statusMessage = document.getElementById('statusMessage');
const tabs = document.querySelectorAll('.tab');
const userName = document.getElementById('userName');
const saveBtn = document.getElementById('saveBtn');
const saveFullPageBtn = document.getElementById('saveFullPageBtn');

// State
let currentToken = null;
let currentUser = null;

// ============================================================
// Initialization
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['token', 'user']);
  if (data.token && data.user) {
    currentToken = data.token;
    currentUser = data.user;
    showCaptureView();
    loadSelectedText();
  }
});

// ============================================================
// Tab Switching
// ============================================================

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    loginForm.style.display = target === 'login' ? 'flex' : 'none';
    signupForm.style.display = target === 'signup' ? 'flex' : 'none';
    hideStatus();
  });
});

// ============================================================
// Login
// ============================================================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  setLoading(btn, true);

  try {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      currentToken = data.data.token;
      currentUser = data.data.user;
      await chrome.storage.local.set({ token: currentToken, user: currentUser });
      showStatus('Login successful!', 'success');
      setTimeout(() => {
        showCaptureView();
        loadSelectedText();
      }, 500);
    } else {
      showStatus(data.message || 'Login failed.', 'error');
    }
  } catch (err) {
    showStatus('Connection error. Is the server running?', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ============================================================
// Signup
// ============================================================

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('signupBtn');
  setLoading(btn, true);

  try {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });

    const data = await res.json();

    if (data.success) {
      currentToken = data.data.token;
      currentUser = data.data.user;
      await chrome.storage.local.set({ token: currentToken, user: currentUser });
      showStatus('Account created!', 'success');
      setTimeout(() => {
        showCaptureView();
        loadSelectedText();
      }, 500);
    } else {
      showStatus(data.message || 'Signup failed.', 'error');
    }
  } catch (err) {
    showStatus('Connection error. Is the server running?', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ============================================================
// Logout
// ============================================================

logoutBtn.addEventListener('click', async () => {
  currentToken = null;
  currentUser = null;
  await chrome.storage.local.remove(['token', 'user']);
  showAuthView();
  showStatus('Logged out.', 'success');
});

// ============================================================
// Save Selection (existing text)
// ============================================================

saveBtn.addEventListener('click', async () => {
  setLoading(saveBtn, true);

  try {
    const text = document.getElementById('manualText').value.trim();
    const sourceUrl = document.getElementById('manualUrl').value || 'manual-entry';
    const pageTitle = document.getElementById('manualTitle').value || 'Manual Entry';

    if (!text) {
      showStatus('Please enter or select some text to save.', 'error');
      return;
    }

    const res = await fetch(`${API_BASE}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ text, sourceUrl, pageTitle, captureType: 'selection' }),
    });

    const data = await res.json();

    if (data.success) {
      showStatus('✂️ Selection saved to your knowledge base!', 'success');
      document.getElementById('manualText').value = '';
      const preview = document.getElementById('selectionPreview');
      if (preview) preview.style.display = 'none';
    } else {
      showStatus(data.message || 'Failed to save.', 'error');
    }
  } catch (err) {
    showStatus('Connection error. Is the server running?', 'error');
  } finally {
    setLoading(saveBtn, false);
  }
});

// ============================================================
// Save Full Page
// ============================================================

saveFullPageBtn.addEventListener('click', async () => {
  setLoading(saveFullPageBtn, true);

  try {
    // Request full page content from content script via background
    const pageData = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'EXTRACT_FULL_PAGE' }, (response) => {
        resolve(response || { text: '', url: '', title: '' });
      });
    });

    if (!pageData.text || !pageData.text.trim()) {
      showStatus('Could not extract page content. Try a different page.', 'error');
      return;
    }

    const res = await fetch(`${API_BASE}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({
        text: pageData.text,
        sourceUrl: pageData.url || 'unknown',
        pageTitle: pageData.title || 'Untitled Page',
        captureType: 'full-page',
      }),
    });

    const data = await res.json();

    if (data.success) {
      showStatus('📄 Full page saved to your knowledge base!', 'success');
    } else {
      showStatus(data.message || 'Failed to save.', 'error');
    }
  } catch (err) {
    showStatus('Connection error. Is the server running?', 'error');
  } finally {
    setLoading(saveFullPageBtn, false);
  }
});

// ============================================================
// Load Selected Text from Active Tab
// ============================================================

async function loadSelectedText() {
  try {
    chrome.runtime.sendMessage({ type: 'GET_SELECTED_TEXT' }, (response) => {
      if (response && response.text) {
        document.getElementById('manualText').value = response.text;
        document.getElementById('manualUrl').value = response.url || '';
        document.getElementById('manualTitle').value = response.title || '';

        const preview = document.getElementById('selectionPreview');
        const previewContent = document.getElementById('selectedText');
        const previewSource = document.getElementById('selectedSource');

        previewContent.textContent =
          response.text.length > 200
            ? response.text.substring(0, 200) + '...'
            : response.text;
        previewSource.textContent = response.url || '';
        preview.style.display = 'block';
      }
    });
  } catch (err) {
    // Ignore — content script may not be available
  }
}

// ============================================================
// Helpers
// ============================================================

function showCaptureView() {
  authSection.style.display = 'none';
  captureSection.style.display = 'flex';
  captureSection.style.flexDirection = 'column';
  captureSection.style.gap = '12px';
  logoutBtn.style.display = 'flex';
  if (currentUser) {
    userName.textContent = currentUser.name;
  }
}

function showAuthView() {
  authSection.style.display = 'block';
  captureSection.style.display = 'none';
  logoutBtn.style.display = 'none';
  // Reset forms
  loginForm.reset();
  signupForm.reset();
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  setTimeout(hideStatus, 4000);
}

function hideStatus() {
  statusMessage.style.display = 'none';
}

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (loading) {
    text.style.display = 'none';
    loader.style.display = 'block';
    btn.disabled = true;
  } else {
    text.style.display = 'inline';
    loader.style.display = 'none';
    btn.disabled = false;
  }
}
