// GitHub热门仓库排行榜应用
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    const reposPerPage = 10;
    let currentPage = 1;
    let currentLanguage = '';
    let totalRepos = 0;
    let languages = [];
    let githubToken = localStorage.getItem('github_token') || '';
    
    // DOM元素
    const repoList = document.getElementById('repo-list');
    const pagination = document.getElementById('pagination');
    const languageFilter = document.getElementById('language-filter');
    const tokenInput = document.getElementById('github-token');
    const saveTokenButton = document.getElementById('save-token');
    
    // 初始化应用
    init();
    
    async function init() {
        // 设置令牌输入框初始值
        tokenInput.value = githubToken;
        
        try {
            // 获取初始数据
            await fetchRepositories();
            
            // 设置语言筛选器事件监听
            languageFilter.addEventListener('change', async (e) => {
                currentLanguage = e.target.value;
                currentPage = 1;
                await fetchRepositories();
            });
            
            // 设置令牌保存按钮事件监听
            saveTokenButton.addEventListener('click', saveToken);
            
        } catch (error) {
            showError(error.message);
        }
    }
    
    // 保存GitHub令牌
    function saveToken() {
        githubToken = tokenInput.value.trim();
        if (githubToken) {
            localStorage.setItem('github_token', githubToken);
            showMessage('令牌已保存', 'success');
        } else {
            localStorage.removeItem('github_token');
            showMessage('已清除令牌', 'info');
        }
    }
    
    // 从GitHub API获取仓库数据
    async function fetchRepositories() {
        repoList.innerHTML = '<div class="loading">加载中...</div>';
        
        try {
            // 构建API URL
            let url = `https://api.github.com/search/repositories?q=stars:>1000${currentLanguage ? `+language:${encodeURIComponent(currentLanguage)}` : ''}&sort=stars&order=desc&page=${currentPage}&per_page=${reposPerPage}`;
            
            const headers = {};
            if (githubToken) {
                headers['Authorization'] = `token ${githubToken}`;
            }
            
            const response = await fetch(url, { headers });
            
            // 检查API速率限制
            const rateLimitInfo = checkRateLimit(response.headers);
            
            if (response.status === 401) {
                throw new Error('令牌无效或已过期');
            }
            
            if (response.status === 403 && rateLimitInfo.remaining === 0) {
                throw new Error(`API速率限制已达上限，将在 ${rateLimitInfo.resetMinutes} 分钟后重置`);
            }
            
            if (!response.ok) {
                throw new Error(`GitHub API错误: ${response.status}`);
            }
            
            const data = await response.json();
            totalRepos = data.total_count;
            
            // 提取语言列表（如果尚未获取）
            if (languages.length === 0) {
                extractLanguages(data.items);
                populateLanguageFilter();
            }
            
            // 渲染仓库列表和分页
            renderRepositories(data.items);
            renderPagination();
            
            // 显示速率限制信息
            showRateLimitInfo(rateLimitInfo);
            
        } catch (error) {
            showError(error.message);
        }
    }
    
    // 从仓库数据中提取语言列表
    function extractLanguages(repos) {
        const languageSet = new Set();
        
        repos.forEach(repo => {
            if (repo.language) {
                languageSet.add(repo.language);
            }
        });
        
        languages = Array.from(languageSet).sort();
    }
    
    // 填充语言筛选下拉菜单
    function populateLanguageFilter() {
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            languageFilter.appendChild(option);
        });
    }
    
    // 渲染仓库列表
    function renderRepositories(repos) {
        repoList.innerHTML = '';
        
        if (repos.length === 0) {
            repoList.innerHTML = '<div class="error">没有找到仓库</div>';
            return;
        }
        
        repos.forEach(repo => {
            const repoCard = document.createElement('div');
            repoCard.className = 'repo-card';
            
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
                </div>
            `;
            
            repoList.appendChild(repoCard);
        });
    }
    
    // 渲染分页控件
    function renderPagination() {
        pagination.innerHTML = '';
        
        const totalPages = Math.ceil(totalRepos / reposPerPage);
        const maxVisiblePages = 5; // 最多显示5个页码
        
        if (totalPages <= 1) return;
        
        // 计算起始和结束页码
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        // 调整起始页码以确保显示maxVisiblePages个页码
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // 添加"上一页"按钮
        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = '上一页';
            prevButton.addEventListener('click', async () => {
                currentPage--;
                await fetchRepositories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            pagination.appendChild(prevButton);
        }
        
        // 添加页码按钮
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            
            pageButton.addEventListener('click', async () => {
                currentPage = i;
                await fetchRepositories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            pagination.appendChild(pageButton);
        }
        
        // 添加"下一页"按钮
        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = '下一页';
            nextButton.addEventListener('click', async () => {
                currentPage++;
                await fetchRepositories();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            pagination.appendChild(nextButton);
        }
    }
    
    // 显示错误信息
    function showError(message) {
        repoList.innerHTML = `<div class="error">错误: ${message}</div>`;
        pagination.innerHTML = '';
    }
    
    // 显示成功/信息消息
    function showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.padding = '10px 20px';
        messageDiv.style.borderRadius = '6px';
        messageDiv.style.zIndex = '1000';
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#238636';
        } else {
            messageDiv.style.backgroundColor = '#1f6feb';
        }
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
    
    // 检查GitHub API速率限制
    function checkRateLimit(headers) {
        const remaining = parseInt(headers.get('X-RateLimit-Remaining') || '0');
        const limit = parseInt(headers.get('X-RateLimit-Limit') || '60');
        const resetTime = parseInt(headers.get('X-RateLimit-Reset') || '0');
        
        const resetDate = new Date(resetTime * 1000);
        const now = new Date();
        const resetMinutes = Math.round((resetDate - now) / 60000);
        
        return {
            remaining,
            limit,
            resetDate,
            resetMinutes
        };
    }
    
    // 显示速率限制信息
    function showRateLimitInfo(rateLimitInfo) {
        console.log(`API请求剩余: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
        console.log(`重置时间: ${rateLimitInfo.resetDate.toLocaleString()}`);
        
        if (rateLimitInfo.remaining < 10) {
            showMessage(`API请求剩余: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`, 'info');
        }
    }
    
    // 获取编程语言颜色
    function getLanguageColor(language) {
        // 常见语言颜色映射
        const colors = {
            'JavaScript': '#f1e05a',
            'TypeScript': '#3178c6',
            'Python': '#3572A5',
            'Java': '#b07219',
            'C++': '#f34b7d',
            'C#': '#178600',
            'Ruby': '#701516',
            'Go': '#00ADD8',
            'PHP': '#4F5D95',
            'Swift': '#ffac45',
            'Kotlin': '#A97BFF',
            'Rust': '#dea584',
            'HTML': '#e34c26',
            'CSS': '#563d7c',
            'Shell': '#89e051',
            'Dart': '#00B4AB',
            'Scala': '#c22d40',
            'R': '#198CE7',
            'Vue': '#41b883',
            'React': '#61dafb'
        };
        
        return colors[language] || '#8b949e';
    }
});