// Backend API URL (Relative)
const API_URL = '/api';

// State
let user = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Page specific init
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        initHome();
    } else if (window.location.pathname.includes('login.html')) {
        initLogin();
    } else if (window.location.pathname.includes('admin.html')) {
        // initAdmin called after auth check
    }

    // Global Logout
    const logoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-nav');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
            window.location.href = 'index.html';
        });
    });
});

async function checkAuth() {
    try {
        const res = await fetch(`${API_URL}/auth/me`);
        if (res.ok) {
            const data = await res.json();
            user = data.user;
            updateUIForUser();

            // Redirect if on login page
            if (window.location.pathname.includes('login.html')) {
                window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
            }

            // Init Admin if on admin page
            if (window.location.pathname.includes('admin.html')) {
                loadAdminNews();
            }
        } else {
            // Redirect if on protected page
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'login.html';
            }
        }
    } catch (e) {
        console.error('Auth check failed', e);
    }
}

function updateUIForUser() {
    const loginLink = document.getElementById('auth-link-login');
    const dashboardLink = document.getElementById('auth-link-dashboard');
    const logoutLink = document.getElementById('auth-link-logout');

    if (user && loginLink) {
        loginLink.style.display = 'none';
        logoutLink.style.display = 'block';
        if (user.role === 'admin') {
            dashboardLink.style.display = 'block';
        }
    }
}

// --- Home Page Logic ---
function initHome() {
    loadNews();
    initSearch();
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

async function loadNews(params = {}) {
    const grid = document.getElementById('news-grid');
    if (!grid) return;

    grid.innerHTML = '<p>Loading latest news...</p>';

    try {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/news/public?${query}`);
        const newsData = await res.json();

        if (newsData.length === 0) {
            grid.innerHTML = '<p>No news found.</p>';
            return;
        }

        grid.innerHTML = newsData.map(item => `
            <article class="news-card">
                <div class="news-image" style="background-color: ${getCategoryColor(item.category)}20">
                    <i class="fas fa-newspaper fa-3x" style="color:${getCategoryColor(item.category)}"></i>
                </div>
                <div class="news-content">
                    <div class="news-meta">
                        <span class="news-category">${item.category || 'General'}</span>
                        <span class="news-date">${new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h3 class="news-title">${item.title}</h3>
                    <p class="news-excerpt">${item.content.substring(0, 100)}...</p>
                    ${item.ai_summary ? `<p style="font-size:0.8rem; color:#666; margin-top:5px;">🤖 <small>${item.ai_summary}</small></p>` : ''}
                </div>
            </article>
        `).join('');

    } catch (e) {
        grid.innerHTML = '<p>Error loading news.</p>';
    }
}

function getCategoryColor(cat) {
    const colors = { 'Politics': '#ef4444', 'Community': '#10b981', 'Events': '#f59e0b', 'Weather': '#3b82f6', 'Transport': '#8b5cf6' };
    return colors[cat] || '#64748b';
}

function initSearch() {
    const searchInput = document.getElementById('news-search');
    const searchBtn = document.getElementById('search-btn');
    if (searchInput) {
        searchBtn.addEventListener('click', () => loadNews({ search: searchInput.value }));
    }
}

function updateDateTime() {
    const el = document.getElementById('datetime-display');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
}


// --- Admin Logic ---
async function loadAdminNews() {
    const container = document.getElementById('pending-news-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/news/admin?status=pending`);
        const data = await res.json();

        if (data.length === 0) {
            container.innerHTML = '<p>No pending approvals. Simulated AI is looking for news...</p>';
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="pending-item ${item.importance === 'High' ? 'high-priority' : ''}">
                <div style="display:flex; justify-content:space-between;">
                    <h4>${item.title}</h4>
                    <span class="ai-badge">AI DETECTED</span>
                </div>
                <p><strong>Content:</strong> ${item.content}</p>
                <p><small>Source: ${item.source} | Category: ${item.category} | Confidence: High</small></p>
                <p><small>Summary: ${item.ai_summary}</small></p>
                <div class="actions">
                    <button class="btn-sm btn-approve" onclick="updateStatus(${item.id}, 'approved')">Approve</button>
                    <button class="btn-sm btn-reject" onclick="updateStatus(${item.id}, 'rejected')">Reject</button>
                    <button class="btn-sm btn-edit" onclick="alert('Edit feature coming soon')">Edit</button>
                </div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = '<p>Error loading admin data.</p>';
    }
}

window.updateStatus = async function (id, status) {
    if (!confirm(`Mark this news as ${status}?`)) return;

    try {
        const res = await fetch(`${API_URL}/news/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            loadAdminNews(); // Refresh list
        }
    } catch (e) {
        console.error('Update failed', e);
    }
};


// --- Login Logic ---
function initLogin() {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active');
        });
    });

    // Login Form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        const msg = document.getElementById('auth-message');

        if (res.ok) {
            msg.style.color = 'green';
            msg.textContent = 'Login successful! Redirecting...';
            setTimeout(() => window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html', 1000);
        } else {
            msg.style.color = 'red';
            msg.textContent = data.error;
        }
    });

    // Signup Form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;

        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        const msg = document.getElementById('auth-message');

        if (res.ok) {
            msg.style.color = 'green';
            msg.textContent = 'Account created! Please login.';
        } else {
            msg.style.color = 'red';
            msg.textContent = data.error || 'Registration failed';
        }
    });
}
