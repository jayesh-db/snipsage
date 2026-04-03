/* ============================================================
   SnipSage Dashboard — Main Application
   ============================================================ */

/**
 * API base URL — uses relative path so it automatically works on both
 * localhost (development) and Vercel (production).
 */
const API = '/api';

// ============================================================
// State
// ============================================================
const state = {
  token: null,
  user: null,
  currentView: 'knowledge',
  chatSessionId: null,
  chatSnippetId: null,
  contentPage: 1,
  contentSearch: '',
  isLoading: false,
};

// ============================================================
// Initialization
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check for existing session
  const savedToken = localStorage.getItem('snipsage_token');
  const savedUser = localStorage.getItem('snipsage_user');

  if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    showDashboard();
  } else {
    showAuthPage();
  }

  initAuthEvents();
  initDashboardEvents();
  initChatEvents();
});

// ============================================================
// AUTH PAGE
// ============================================================
function showAuthPage() {
  document.getElementById('authPage').style.display = 'flex';
  document.getElementById('dashboardPage').style.display = 'none';
}

function showDashboard() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('dashboardPage').style.display = 'flex';
  updateUserUI();
  loadContent();
}

function initAuthEvents() {
  // Tab switching
  document.getElementById('loginTab').addEventListener('click', () => {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
    document.getElementById('loginForm').style.display = 'flex';
    document.getElementById('signupFormDashboard').style.display = 'none';
    hideAuthError();
  });

  document.getElementById('signupTab').addEventListener('click', () => {
    document.getElementById('signupTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupFormDashboard').style.display = 'flex';
    document.getElementById('loginForm').style.display = 'none';
    hideAuthError();
  });

  // Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('authLoginBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const email = document.getElementById('authLoginEmail').value;
      const password = document.getElementById('authLoginPassword').value;

      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        state.token = data.data.token;
        state.user = data.data.user;
        localStorage.setItem('snipsage_token', state.token);
        localStorage.setItem('snipsage_user', JSON.stringify(state.user));
        showDashboard();
      } else {
        showAuthError(data.message || 'Login failed.');
      }
    } catch (err) {
      showAuthError('Connection error. Is the server running?');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // Signup
  document.getElementById('signupFormDashboard').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('authSignupBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      const name = document.getElementById('authSignupName').value;
      const email = document.getElementById('authSignupEmail').value;
      const password = document.getElementById('authSignupPassword').value;

      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();

      if (data.success) {
        state.token = data.data.token;
        state.user = data.data.user;
        localStorage.setItem('snipsage_token', state.token);
        localStorage.setItem('snipsage_user', JSON.stringify(state.user));
        showDashboard();
      } else {
        showAuthError(data.message || 'Signup failed.');
      }
    } catch (err) {
      showAuthError('Connection error. Is the server running?');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideAuthError() {
  document.getElementById('authError').style.display = 'none';
}

// ============================================================
// DASHBOARD
// ============================================================
function updateUserUI() {
  if (!state.user) return;
  document.getElementById('dashUserName').textContent = state.user.name;
  document.getElementById('dashUserEmail').textContent = state.user.email;
  document.getElementById('userAvatar').textContent = state.user.name.charAt(0).toUpperCase();
}

function initDashboardEvents() {
  // Navigation
  document.getElementById('navKnowledge').addEventListener('click', () => switchView('knowledge'));
  document.getElementById('navChat').addEventListener('click', () => {
    switchView('chat');
    loadChatHistory();
  });

  // Logout
  document.getElementById('dashLogoutBtn').addEventListener('click', () => {
    state.token = null;
    state.user = null;
    localStorage.removeItem('snipsage_token');
    localStorage.removeItem('snipsage_user');
    showAuthPage();
  });

  // Search (debounced)
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.contentSearch = e.target.value;
      state.contentPage = 1;
      loadContent();
    }, 400);
  });

  // Pagination
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    if (state.contentPage > 1) {
      state.contentPage--;
      loadContent();
    }
  });

  document.getElementById('nextPageBtn').addEventListener('click', () => {
    state.contentPage++;
    loadContent();
  });

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
  }
}

function switchView(view) {
  state.currentView = view;

  // Update nav buttons
  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Toggle sidebar chat history visibility
  const historyList = document.getElementById('chatHistoryList');
  if (historyList) {
    historyList.style.display = view === 'chat' ? 'flex' : 'none';
  }

  // Show/hide views
  document.getElementById('knowledgeView').style.display = view === 'knowledge' ? 'block' : 'none';
  document.getElementById('chatView').style.display = view === 'chat' ? 'block' : 'none';

  // Close mobile sidebar
  closeMobileSidebar();
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeMobileSidebar);
    document.getElementById('dashboardPage').appendChild(overlay);
  }
  overlay.classList.toggle('active');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}

// ============================================================
// KNOWLEDGE BASE
// ============================================================
async function loadContent() {
  const listEl = document.getElementById('contentList');

  try {
    const params = new URLSearchParams({
      page: state.contentPage.toString(),
      limit: '15',
    });
    if (state.contentSearch) params.set('search', state.contentSearch);

    const res = await fetch(`${API}/content?${params}`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    const data = await res.json();

    if (!data.success) {
      if (res.status === 401) {
        // Token expired
        state.token = null;
        localStorage.removeItem('snipsage_token');
        showAuthPage();
        return;
      }
      throw new Error(data.message);
    }

    const { contents, total, page, totalPages } = data.data;

    // Update stats
    document.getElementById('totalSnips').textContent = total;

    // Count unique sources
    const uniqueSources = new Set(contents.map((c) => {
      try { return new URL(c.sourceUrl).hostname; } catch { return c.sourceUrl; }
    })).size;
    document.getElementById('totalSources').textContent = uniqueSources;

    // Count recent (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCount = contents.filter((c) => new Date(c.savedAt).getTime() > weekAgo).length;
    document.getElementById('recentCount').textContent = recentCount;

    // Render content cards
    if (contents.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h3>${state.contentSearch ? 'No results found' : 'No content saved yet'}</h3>
          <p>${state.contentSearch ? 'Try a different search term.' : 'Use the SnipSage Chrome Extension to start capturing web content.'}</p>
        </div>
      `;
    } else {
      listEl.innerHTML = contents.map((c, i) => renderContentCard(c, i)).join('');

      // Attach delete handlers
      listEl.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', () => deleteContent(btn.dataset.id));
      });

      // Attach "Chat with snippet" handlers
      listEl.querySelectorAll('.btn-chat-snippet').forEach((btn) => {
        btn.addEventListener('click', () => {
          startSnippetChat(btn.dataset.id, btn.dataset.title, btn.dataset.url);
        });
      });
    }

    // Update pagination
    const paginationEl = document.getElementById('pagination');
    if (totalPages > 1) {
      paginationEl.style.display = 'flex';
      document.getElementById('paginationInfo').textContent = `Page ${page} of ${totalPages}`;
      document.getElementById('prevPageBtn').disabled = page <= 1;
      document.getElementById('nextPageBtn').disabled = page >= totalPages;
    } else {
      paginationEl.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load content:', err);
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>Error loading content</h3>
        <p>${err.message || 'Failed to connect to the server.'}</p>
      </div>
    `;
  }
}

function renderContentCard(content, index) {
  const date = new Date(content.savedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const textPreview = content.text.length > 250
    ? content.text.substring(0, 250) + '...'
    : content.text;

  let hostname = '';
  try {
    hostname = new URL(content.sourceUrl).hostname;
  } catch {
    hostname = content.sourceUrl;
  }

  const captureType = content.captureType || 'selection';
  const captureIcon = captureType === 'full-page' ? '📄' : '✂️';
  const captureBadge = captureType === 'full-page'
    ? `<span class="capture-badge capture-badge-fullpage">${captureIcon} Full Page</span>`
    : `<span class="capture-badge capture-badge-selection">${captureIcon} Selection</span>`;

  return `
    <div class="content-card" style="animation-delay: ${index * 0.05}s">
      <div class="content-card-header">
        <span class="content-card-title">${escapeHtml(content.pageTitle)}</span>
        <div class="content-card-meta">
          ${captureBadge}
          <span>${dateStr}</span>
        </div>
      </div>
      <div class="content-card-text">${escapeHtml(textPreview)}</div>
      <div class="content-card-footer">
        <a href="${escapeHtml(content.sourceUrl)}" target="_blank" rel="noopener" class="content-card-url">
          🌐 ${escapeHtml(hostname)}
        </a>
        <div class="content-card-actions">
          <button class="btn-chat-snippet" data-id="${content._id}" data-title="${escapeHtml(content.pageTitle)}" data-url="${escapeHtml(content.sourceUrl)}" title="Chat with this snippet">
            💬 Chat
          </button>
          <button class="btn-delete" data-id="${content._id}" title="Delete this snippet">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  `;
}

async function deleteContent(id) {
  if (!confirm('Delete this snippet from your knowledge base?')) return;

  try {
    const res = await fetch(`${API}/content/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    const data = await res.json();

    if (data.success) {
      loadContent();
    } else {
      alert(data.message || 'Failed to delete.');
    }
  } catch (err) {
    alert('Connection error.');
  }
}

// ============================================================
// AI CHAT
// ============================================================
function initChatEvents() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');

  // Send on button click
  sendBtn.addEventListener('click', sendMessage);

  // Send on Enter (Shift+Enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // New chat buttons (header + history panel)
  document.getElementById('newChatBtn').addEventListener('click', startNewChat);
  document.getElementById('newChatBtnHistory').addEventListener('click', startNewChat);

  // Snippet banner close
  document.getElementById('snippetBannerClose').addEventListener('click', () => {
    // Exit snippet mode, start new general chat
    startNewChat();
  });

  // Suggestion chips
  attachSuggestionListeners();
}

function attachSuggestionListeners() {
  document.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('chatInput').value = chip.dataset.prompt;
      sendMessage();
    });
  });
}

// ============================================================
// Chat History
// ============================================================
async function loadChatHistory() {
  const listEl = document.getElementById('chatHistoryList');

  try {
    const res = await fetch(`${API}/chat/history`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    const data = await res.json();

    if (!data.success) {
      listEl.innerHTML = '<div class="chat-history-empty"><p>Failed to load history</p></div>';
      return;
    }

    const sessions = data.data.sessions;

    if (!sessions || sessions.length === 0) {
      listEl.innerHTML = `
        <div class="chat-history-empty">
          <span>💬</span>
          <p>No conversations yet</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = sessions.map((s) => renderChatHistoryItem(s)).join('');

    // Attach click handlers
    listEl.querySelectorAll('.chat-history-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking delete button
        if (e.target.closest('.btn-delete-session')) return;
        openChatSession(item.dataset.sessionId);
      });
    });

    // Attach delete handlers
    listEl.querySelectorAll('.btn-delete-session').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChatSession(btn.dataset.sessionId);
      });
    });

    // Highlight active session
    highlightActiveSession();
  } catch (err) {
    console.error('Failed to load chat history:', err);
    listEl.innerHTML = '<div class="chat-history-empty"><p>Connection error</p></div>';
  }
}

function renderChatHistoryItem(session) {
  const date = new Date(session.updatedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const isActive = state.chatSessionId === session.sessionId;

  const snippetBadge = session.snippetId
    ? `<span class="history-snippet-badge" title="${escapeHtml(session.snippetTitle || 'Snippet')}">🔒 ${escapeHtml((session.snippetTitle || 'Snippet').substring(0, 20))}</span>`
    : '';

  return `
    <div class="chat-history-item ${isActive ? 'active' : ''}" data-session-id="${session.sessionId}">
      <div class="history-item-content">
        <div class="history-item-title">${escapeHtml(session.title)}</div>
        <div class="history-item-meta">
          <span>${dateStr} ${timeStr}</span>
          <span>·</span>
          <span>${session.messageCount} msg${session.messageCount !== 1 ? 's' : ''}</span>
        </div>
        ${snippetBadge}
      </div>
      <button class="btn-delete-session" data-session-id="${session.sessionId}" title="Delete session">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `;
}

function highlightActiveSession() {
  document.querySelectorAll('.chat-history-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.sessionId === state.chatSessionId);
  });
}

// ============================================================
// Open an Existing Chat Session
// ============================================================
async function openChatSession(sessionId) {
  const messagesEl = document.getElementById('chatMessages');
  messagesEl.innerHTML = '<div class="chat-loading"><div class="btn-loader"></div></div>';

  try {
    const res = await fetch(`${API}/chat/session/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    const data = await res.json();

    if (!data.success) {
      messagesEl.innerHTML = '<div class="empty-state"><p>Failed to load session.</p></div>';
      return;
    }

    state.chatSessionId = data.data.sessionId;
    state.chatSnippetId = data.data.snippetId || null;

    // Show/hide snippet banner
    updateSnippetBanner(data.data.snippetId);

    // Render messages
    messagesEl.innerHTML = '';
    const userInitial = state.user ? state.user.name.charAt(0).toUpperCase() : 'U';

    if (data.data.messages.length === 0) {
      showWelcomeScreen();
    } else {
      for (const msg of data.data.messages) {
        const avatar = msg.role === 'user' ? userInitial : '🤖';
        appendMessage(msg.role, msg.content, avatar, msg.sources);
      }
    }

    highlightActiveSession();
  } catch (err) {
    console.error('Failed to open session:', err);
    messagesEl.innerHTML = '<div class="empty-state"><p>Connection error.</p></div>';
  }
}

// ============================================================
// Start a New Chat
// ============================================================
async function startNewChat() {
  state.chatSessionId = null;
  state.chatSnippetId = null;

  // Hide snippet banner
  document.getElementById('snippetChatBanner').style.display = 'none';

  showWelcomeScreen();
  highlightActiveSession();
}

function showWelcomeScreen() {
  const messagesEl = document.getElementById('chatMessages');
  messagesEl.innerHTML = `
    <div class="chat-welcome">
      <div class="welcome-icon">✨</div>
      <h3>Welcome to SnipSage AI</h3>
      <p>I can answer questions based on the content you've saved. Try asking me about topics from your knowledge base!</p>
      <div class="welcome-suggestions">
        <button class="suggestion-chip" data-prompt="What topics do I have saved?">📋 What topics do I have saved?</button>
        <button class="suggestion-chip" data-prompt="Summarize my recent saves">📝 Summarize my recent saves</button>
        <button class="suggestion-chip" data-prompt="What are the key insights from my content?">💡 Key insights from my content</button>
      </div>
    </div>
  `;
  attachSuggestionListeners();
}

// ============================================================
// Start a Snippet-Scoped Chat
// ============================================================
async function startSnippetChat(contentId, title, url) {
  // Switch to chat view
  switchView('chat');

  // Create a new session scoped to this snippet
  try {
    const res = await fetch(`${API}/chat/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      body: JSON.stringify({ snippetId: contentId }),
    });
    const data = await res.json();

    if (!data.success) {
      alert(data.message || 'Failed to create snippet chat session.');
      return;
    }

    state.chatSessionId = data.data.sessionId;
    state.chatSnippetId = contentId;

    // Show snippet banner
    updateSnippetBanner(contentId, title, url);

    // Show welcome screen for snippet chat
    const messagesEl = document.getElementById('chatMessages');
    messagesEl.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-icon">🔒</div>
        <h3>Chat with "${escapeHtml(title)}"</h3>
        <p>Ask questions about this specific snippet. The AI will only use this snippet's content to answer.</p>
        <div class="welcome-suggestions">
          <button class="suggestion-chip" data-prompt="Summarize this content">📝 Summarize this content</button>
          <button class="suggestion-chip" data-prompt="What are the key points?">💡 Key points</button>
          <button class="suggestion-chip" data-prompt="Explain the main ideas">📖 Explain main ideas</button>
        </div>
      </div>
    `;
    attachSuggestionListeners();

    // Reload chat history
    loadChatHistory();
  } catch (err) {
    alert('Connection error. Is the server running?');
  }
}

function updateSnippetBanner(snippetId, title, url) {
  const banner = document.getElementById('snippetChatBanner');

  if (!snippetId) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  const titleEl = document.getElementById('snippetBannerTitle');
  const urlEl = document.getElementById('snippetBannerUrl');

  if (title) {
    titleEl.textContent = title;
  }
  if (url) {
    urlEl.textContent = url;
    urlEl.href = url;
  }
}

// ============================================================
// Delete Chat Session
// ============================================================
async function deleteChatSession(sessionId) {
  if (!confirm('Delete this conversation?')) return;

  try {
    const res = await fetch(`${API}/chat/session/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    const data = await res.json();

    if (data.success) {
      // If we deleted the active session, reset
      if (state.chatSessionId === sessionId) {
        startNewChat();
      }
      loadChatHistory();
    } else {
      alert(data.message || 'Failed to delete session.');
    }
  } catch (err) {
    alert('Connection error.');
  }
}

// ============================================================
// Send Message (New API)
// ============================================================
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || state.isLoading) return;

  state.isLoading = true;
  const sendBtn = document.getElementById('chatSendBtn');
  sendBtn.disabled = true;

  const messagesEl = document.getElementById('chatMessages');

  // Remove welcome screen
  const welcome = messagesEl.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  // Add user message
  const userInitial = state.user ? state.user.name.charAt(0).toUpperCase() : 'U';
  appendMessage('user', message, userInitial);

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    // Step 1: Create session if needed
    if (!state.chatSessionId) {
      const createRes = await fetch(`${API}/chat/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
        body: JSON.stringify(
          state.chatSnippetId
            ? { snippetId: state.chatSnippetId }
            : {}
        ),
      });
      const createData = await createRes.json();

      if (!createData.success) {
        throw new Error(createData.message || 'Failed to create session.');
      }

      state.chatSessionId = createData.data.sessionId;
    }

    // Step 2: Send message to session
    const res = await fetch(`${API}/chat/session/${state.chatSessionId}/message`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`,
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();

    // Remove typing indicator
    removeTypingIndicator(typingId);

    if (data.success) {
      state.chatSessionId = data.data.sessionId;
      appendMessage('assistant', data.data.reply, '🤖', data.data.sources);
      // Refresh history to show updated session
      loadChatHistory();
    } else {
      appendMessage('assistant', `Error: ${data.message || 'Failed to get response.'}`, '⚠️');
    }
  } catch (err) {
    removeTypingIndicator(typingId);
    appendMessage('assistant', 'Connection error. Is the server running?', '⚠️');
  } finally {
    state.isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function appendMessage(role, content, avatar, sources) {
  const messagesEl = document.getElementById('chatMessages');

  let sourcesHtml = '';
  if (sources && sources.length > 0) {
    sourcesHtml = `
      <div class="message-sources">
        ${sources.map((s) => `<span class="source-tag" title="${escapeHtml(s.sourceUrl)}">📄 ${escapeHtml(s.pageTitle)}</span>`).join('')}
      </div>
    `;
  }

  // Simple markdown-like formatting for AI responses
  let formattedContent = escapeHtml(content);
  if (role === 'assistant') {
    // Bold
    formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    // Bullet points
    formattedContent = formattedContent.replace(/^- (.*)/gm, '• $1');
  }

  const messageHtml = `
    <div class="message message-${role}">
      <div class="message-avatar">${avatar}</div>
      <div class="message-bubble">
        <div>${formattedContent}</div>
        ${sourcesHtml}
      </div>
    </div>
  `;

  messagesEl.insertAdjacentHTML('beforeend', messageHtml);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();

  const html = `
    <div class="message message-assistant" id="${id}">
      <div class="message-avatar">🤖</div>
      <div class="message-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;

  messagesEl.insertAdjacentHTML('beforeend', html);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
