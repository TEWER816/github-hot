document.addEventListener('DOMContentLoaded', function() {
    const config = {
        reposPerPage: 10,
        funFactInterval: 30000,
        tabs: ['热门项目', '最新项目']
    };

    const state = {
        currentPage: 1,
        currentLanguage: '',
        currentTab: 0, // 0: 热门项目, 1: 最新项目
        totalRepos: 0,
        languages: [],
        githubToken: localStorage.getItem('github_token') || '',
        hasShownTokenModal: localStorage.getItem('has_shown_token_modal') === 'true'
    };

    const elements = {
        repoList: document.getElementById('repo-list'),
        pagination: document.getElementById('pagination'),
        languageFilter: document.getElementById('language-filter'),
        tokenInput: document.getElementById('github-token'),
        saveTokenButton: document.getElementById('save-token'),
        rateLimitWarning: document.getElementById('rate-limit-warning'),
        themeSwitcher: document.querySelector('.theme-switcher'),
        funFactElement: document.getElementById('fun-fact'),
        tokenModal: document.getElementById('token-modal'),
        modalTokenInput: document.getElementById('modal-token-input'),
        skipTokenBtn: document.getElementById('skip-token-btn'),
        confirmTokenBtn: document.getElementById('confirm-token-btn')
    };

    const funFacts = [
        "💡 GitHub就像代码界的Facebook，开发者们在这里分享项目",
        "🌟 星星就像点赞，越多表示项目越受欢迎",
        "👨‍💻 这里聚集了全球7300万开发者，一起编写代码",
        "🚀 第一个GitHub项目就是GitHub自己",
        "🐱 GitHub的吉祥物是可爱的Octocat，一只章鱼猫",
        "💻 每天有数百万次代码更新，就像不停歇的数字世界",
        "🌎 来自200多个国家的人在这里协作",
        "🔍 你可以找到超过2亿个开源项目",
        "🤖 有超过100万个机器人助手在这里工作",
        "🎉 创始人Tom是第一个GitHub用户"
    ];

    function showRandomFunFact() {
        const randomIndex = Math.floor(Math.random() * funFacts.length);
        elements.funFactElement.textContent = funFacts[randomIndex];
        elements.funFactElement.style.animation = 'none';
        void elements.funFactElement.offsetWidth;
        elements.funFactElement.style.animation = 'slideIn 0.5s ease-out';
        // 添加解释说明
        setTimeout(() => {
            elements.funFactElement.setAttribute('title', '点击可以更换小知识');
        }, 1000);
    }

    init();

    async function init() {
        initUI();
        setupEventListeners();        renderTabs(); // 确保在初始化时渲染标签页
        try {
            await fetchRepositories();
        } catch (error) {
            showError(error.message);
        }
    }

    function renderTabs() {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs';
        
        config.tabs.forEach((tab, index) => {
            const tabElement = document.createElement('button');
            tabElement.textContent = tab;
            tabElement.className = index === state.currentTab ? 'tab active' : 'tab';
            tabElement.addEventListener('click', async () => {
                state.currentTab = index;
                state.currentPage = 1;
                // 更新标签页活动状态
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });
                tabElement.classList.add('active');
                await fetchRepositories();
            });
            tabsContainer.appendChild(tabElement);
        });
        
        const existingTabs = document.querySelector('.tabs');
        if (existingTabs) {
            existingTabs.replaceWith(tabsContainer);
        } else {
            document.querySelector('h1').after(tabsContainer);
        }
    }

    function initUI() {
        elements.tokenInput.value = state.githubToken;
        initTheme();
        if (!state.githubToken && !state.hasShownTokenModal) {
            showTokenModal();
        }
        setupFunFacts();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        elements.themeSwitcher.addEventListener('click', toggleTheme);
    }

    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    }

    function setupFunFacts() {
        showRandomFunFact();
        setInterval(showRandomFunFact, config.funFactInterval);
        elements.funFactElement.addEventListener('click', showRandomFunFact);
    }

    function setupEventListeners() {
        elements.languageFilter.addEventListener('change', async (e) => {
            state.currentLanguage = e.target.value;
            state.currentPage = 1;
            await fetchRepositories();
        });
        
        elements.saveTokenButton.addEventListener('click', saveToken);
        
        elements.skipTokenBtn.addEventListener('click', () => {
            localStorage.setItem('has_shown_token_modal', 'true');
            elements.tokenModal.style.display = 'none';
        });
        
        elements.confirmTokenBtn.addEventListener('click', () => {
            const token = elements.modalTokenInput.value.trim();
            if (token) {
                state.githubToken = token;
                localStorage.setItem('github_token', token);
                elements.tokenInput.value = token;
                showMessage('令牌已保存', 'success');
            }
            localStorage.setItem('has_shown_token_modal', 'true');
            elements.tokenModal.style.display = 'none';
        });
    }

    function saveToken() {
        state.githubToken = elements.tokenInput.value.trim();
        if (state.githubToken) {
            localStorage.setItem('github_token', state.githubToken);
            showMessage('令牌已保存', 'success');
        } else {
            localStorage.removeItem('github_token');
            showMessage('已清除令牌', 'info');
        }
    }

    function showTokenModal() {
        elements.tokenModal.style.display = 'flex';
    }

    async function fetchRepositories() {
        showLoading();
        try {
            const data = await fetchRepoData();
            state.totalRepos = data.total_count;
            if (state.languages.length === 0) {
                initLanguageFilter(data.items);
            }
            renderRepositories(data.items);
            renderPagination();
        } catch (error) {
            showError(error.message);
        }
    }

    async function fetchRepoData() {
        const url = buildApiUrl();
        const headers = buildRequestHeaders();
        const response = await fetch(url, { headers });
        const rateLimitInfo = checkRateLimit(response.headers);
        handleRateLimit(rateLimitInfo);
        if (!response.ok) {
            throw new Error(`GitHub API错误: ${response.status}`);
        }
        return await response.json();
    }

    function buildApiUrl() {
        const baseUrl = 'https://api.github.com/search/repositories';
        const query = state.currentTab === 0 
            ? `q=stars:>1000${state.currentLanguage ? `+language:${encodeURIComponent(state.currentLanguage)}` : ''}`
            : `q=created:>${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}${state.currentLanguage ? `+language:${encodeURIComponent(state.currentLanguage)}` : ''}`;
        const sort = state.currentTab === 0 ? 'sort=stars&order=desc' : 'sort=updated&order=desc';
        const page = `page=${state.currentPage}&per_page=${config.reposPerPage}`;
        return `${baseUrl}?${query}&${sort}&${page}`;
    }

    function buildRequestHeaders() {
        const headers = {};
        if (state.githubToken) {
            headers['Authorization'] = `token ${state.githubToken}`;
        }
        return headers;
    }

    function checkRateLimit(headers) {
        const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0');
        const limit = parseInt(headers.get('X-RateLimit-Limit') || '60');
        const resetTime = parseInt(headers.get('X-RateLimit-Reset') || '0');
        const resetDate = new Date(resetTime * 1000);
        const now = new Date();
        const resetMinutes = Math.round((resetDate - now) / 60000);
        return { remaining, limit, resetTime, resetMinutes };
    }

    function handleRateLimit(rateLimitInfo) {
        updateRateLimitInfo(rateLimitInfo);
        if (rateLimitInfo.remaining === 0) {
            throw new Error(`API速率限制已达上限，将在 ${rateLimitInfo.resetMinutes} 分钟后重置`);
        }
    }

    function updateRateLimitInfo(rateLimitInfo) {
        if (rateLimitInfo.remaining === 0) {
            showRateLimitWarning(rateLimitInfo);
        } else {
            hideRateLimitWarning();
            if (rateLimitInfo.remaining < 10) {
                showMessage(`API请求剩余: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`, 'info');
            }
        }
    }

    function showRateLimitWarning(rateLimitInfo) {
        const resetTime = new Date(rateLimitInfo.resetTime * 1000);
        const formattedTime = resetTime.toLocaleTimeString();
        elements.rateLimitWarning.innerHTML = `⚠️ API请求次数已达上限！剩余 ${rateLimitInfo.remaining}/${rateLimitInfo.limit} 次请求。将在 ${formattedTime} (${rateLimitInfo.resetMinutes}分钟后) 重置`;
        elements.rateLimitWarning.style.display = 'block';
    }

    function hideRateLimitWarning() {
        elements.rateLimitWarning.style.display = 'none';
    }

    function initLanguageFilter(repos) {
        extractLanguages(repos);
        populateLanguageFilter();
    }

    function extractLanguages(repos) {
        const languageSet = new Set();
        repos.forEach(repo => {
            if (repo.language) {
                languageSet.add(repo.language);
            }
        });
        state.languages = Array.from(languageSet).sort();
    }

    function populateLanguageFilter() {
        elements.languageFilter.innerHTML = '<option value="">所有语言</option>';
        state.languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            elements.languageFilter.appendChild(option);
        });
    }

    function showLoading() {
        elements.repoList.innerHTML = '<div class="loading">加载中...</div>';
    }

    function renderRepositories(repos) {
        if (repos.length === 0) {
            elements.repoList.innerHTML = '<div class="error">没有找到仓库</div>';
            return;
        }
        elements.repoList.innerHTML = '';
        repos.forEach(repo => {
            const repoCard = createRepoCard(repo);
            elements.repoList.appendChild(repoCard);
        });
    }

    function createRepoCard(repo) {
        const repoCard = document.createElement('div');
        repoCard.className = 'repo-card';
        const createdAt = new Date(repo.created_at);
        const now = new Date();
        const diffDays = Math.ceil(Math.abs(now - createdAt) / (1000 * 60 * 60 * 24));
        repoCard.innerHTML = `
            <h2 class="repo-name">
                <a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a>
            </h2>
            <p class="repo-desc">${repo.description || '无描述'}</p>
            <div class="repo-meta">
                ${repo.language ? `
                <span class="repo-language">
                    <span class="language-color" style="background-color: ${getLanguageColor(repo.language)}"></span>
                    ${repo.language}
                </span>
                ` : ''}
                <span class="repo-stars">
                    <svg height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                    </svg>
                    ${repo.stargazers_count.toLocaleString()}
                </span>
                <span class="repo-forks">
                    <svg height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z"></path>
                    </svg>
                    ${repo.forks_count.toLocaleString()}
                </span>
                <span class="repo-age" title="创建于 ${new Date(repo.created_at).toLocaleDateString()}">
                    <svg height="16" viewBox="0 0 16 16" width="16">
                        <path fill-rule="evenodd" d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 00.471.696l2.5 1a.75.75 0 00.557-1.392L8.5 7.742V4.75z"></path>
                    </svg>
                    ${diffDays}天前
                </span>
            </div>
        `;
        repoCard.addEventListener('click', (e) => {
            if (e.target.tagName !== 'A') {
                repoCard.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    repoCard.style.transform = '';
                }, 200);
            }
        });
        return repoCard;
    }

    function renderPagination() {
        elements.pagination.innerHTML = '';
        const totalPages = Math.ceil(state.totalRepos / config.reposPerPage);
        const maxVisiblePages = 5;
        if (totalPages <= 1) return;
        let startPage = Math.max(1, state.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        if (state.currentPage > 1) {
            const prevButton = createPaginationButton('上一页', async () => {
                state.currentPage--;
                await fetchRepositories();
                scrollToTop();
            });
            elements.pagination.appendChild(prevButton);
        }
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = createPaginationButton(i, async () => {
                state.currentPage = i;
                await fetchRepositories();
                scrollToTop();
            });
            if (i === state.currentPage) {
                pageButton.classList.add('active');
            }
            elements.pagination.appendChild(pageButton);
        }
        if (state.currentPage < totalPages) {
            const nextButton = createPaginationButton('下一页', async () => {
                state.currentPage++;
                await fetchRepositories();
                scrollToTop();
            });
            elements.pagination.appendChild(nextButton);
        }
    }

    function createPaginationButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.addEventListener('click', onClick);
        return button;
    }

    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    function getLanguageColor(language) {
        const colors = {
            'JavaScript': '#f1e05a',
            'TypeScript': '#3178c6',
            'Python': '#3572A5',
            'Java': '#b07219',
            'C++': '#f34b7d',
            'C#': '#178600',
            'PHP': '#4F5D95',
            'Ruby': '#701516',
            'Go': '#00ADD8',
            'Swift': '#ffac45'
        };
        return colors[language] || '#cccccc';
    }

    function showError(message) {
        elements.repoList.innerHTML = `<div class="error">错误: ${message}</div>`;
        elements.pagination.innerHTML = '';
    }

    function showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '6px';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.animation = 'slideIn 0.5s ease-out';
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#238636';
        } else {
            messageDiv.style.backgroundColor = '#1f6feb';
        }
        document.body.appendChild(messageDiv);
        setTimeout(() => {
            messageDiv.style.animation = 'none';
            messageDiv.style.opacity = '0';
            messageDiv.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                messageDiv.remove();
            }, 500);
        }, 3000);
    }
});

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);
