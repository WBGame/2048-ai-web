/* ════════════════════════════════════════════════
   2048 AI版 - 扩展功能
   包含：AI配置、排行榜、帮助系统
   ════════════════════════════════════════════════ */

// ── AI 配置系统 ─────────────────────────────────
const AIConfig = {
  // 默认配置
  defaults: {
    depth: 3,
    cornerWeight: 70,
    emptyWeight: 50,
    monoWeight: 40
  },
  
  // 当前配置
  current: {},
  
  // 初始化
  init() {
    const saved = localStorage.getItem('aiConfig');
    this.current = saved ? JSON.parse(saved) : {...this.defaults};
    this.applyToUI();
  },
  
  // 保存配置
  save() {
    localStorage.setItem('aiConfig', JSON.stringify(this.current));
  },
  
  // 重置为默认
  reset() {
    this.current = {...this.defaults};
    this.save();
    this.applyToUI();
  },
  
  // 应用到UI
  applyToUI() {
    document.getElementById('config-depth').value = this.current.depth;
    document.getElementById('depth-value').textContent = this.current.depth;
    document.getElementById('config-corner').value = this.current.cornerWeight;
    document.getElementById('corner-value').textContent = this.current.cornerWeight;
    document.getElementById('config-empty').value = this.current.emptyWeight;
    document.getElementById('empty-value').textContent = this.current.emptyWeight;
    document.getElementById('config-mono').value = this.current.monoWeight;
    document.getElementById('mono-value').textContent = this.current.monoWeight;
  },
  
  // 从UI读取
  readFromUI() {
    this.current.depth = parseInt(document.getElementById('config-depth').value);
    this.current.cornerWeight = parseInt(document.getElementById('config-corner').value);
    this.current.emptyWeight = parseInt(document.getElementById('config-empty').value);
    this.current.monoWeight = parseInt(document.getElementById('config-mono').value);
    this.save();
  }
};

// ── 排行榜系统 ───────────────────────────────────
const RankSystem = {
  // 获取高分榜
  getHighScores() {
    const data = localStorage.getItem('2048HighScores');
    return data ? JSON.parse(data) : [];
  },
  
  // 保存分数
  saveScore(score, maxTile) {
    const scores = this.getHighScores();
    const entry = {
      score,
      maxTile,
      date: new Date().toLocaleString('zh-CN'),
      timestamp: Date.now()
    };
    scores.push(entry);
    // 按分数排序，保留前20
    scores.sort((a, b) => b.score - a.score);
    const top20 = scores.slice(0, 20);
    localStorage.setItem('2048HighScores', JSON.stringify(top20));
    return top20;
  },
  
  // 获取历史记录
  getHistory() {
    const data = localStorage.getItem('2048History');
    return data ? JSON.parse(data) : [];
  },
  
  // 添加历史记录
  addHistory(score, maxTile) {
    const history = this.getHistory();
    history.unshift({
      score,
      maxTile,
      date: new Date().toLocaleString('zh-CN')
    });
    // 保留最近50条
    const recent = history.slice(0, 50);
    localStorage.setItem('2048History', JSON.stringify(recent));
    return recent;
  },
  
  // 渲染排行榜
  renderHighScores() {
    const scores = this.getHighScores();
    const list = document.getElementById('rank-list');
    if (scores.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无记录，开始游戏吧！</p>';
      return;
    }
    
    list.innerHTML = scores.map((item, index) => `
      <div class="rank-item">
        <div class="rank-number">${index + 1}</div>
        <div class="rank-score">${item.score} 分</div>
        <div class="rank-time">${item.date}</div>
      </div>
    `).join('');
  },
  
  // 渲染历史记录
  renderHistory() {
    const history = this.getHistory();
    const list = document.getElementById('rank-list');
    if (history.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无记录</p>';
      return;
    }
    
    list.innerHTML = history.map((item, index) => `
      <div class="rank-item">
        <div class="rank-number">${index + 1}</div>
        <div class="rank-score">${item.score} 分</div>
        <div class="rank-time">${item.date}</div>
      </div>
    `).join('');
  }
};

// ── 面板控制 ─────────────────────────────────────
const PanelControl = {
  init() {
    // 配置面板
    const configPanel = document.getElementById('config-panel');
    const rankPanel = document.getElementById('rank-panel');
    const helpModal = document.getElementById('help-modal');
    
    // 配置按钮
    document.getElementById('btn-config').addEventListener('click', () => {
      configPanel.classList.toggle('hidden');
      rankPanel.classList.add('hidden');
    });
    
    // 排行榜按钮
    document.getElementById('btn-rank').addEventListener('click', () => {
      rankPanel.classList.toggle('hidden');
      configPanel.classList.add('hidden');
      RankSystem.renderHighScores();
    });
    
    // 关闭排行榜
    document.getElementById('btn-close-rank').addEventListener('click', () => {
      rankPanel.classList.add('hidden');
    });
    
    // 保存配置
    document.getElementById('btn-save-config').addEventListener('click', () => {
      AIConfig.readFromUI();
      configPanel.classList.add('hidden');
      alert('配置已保存！AI 将按照新配置进行游戏。');
    });
    
    // 重置配置
    document.getElementById('btn-reset-config').addEventListener('click', () => {
      AIConfig.reset();
      alert('已恢复默认配置！');
    });
    
    // 滑块值更新
    document.getElementById('config-depth').addEventListener('input', (e) => {
      document.getElementById('depth-value').textContent = e.target.value;
    });
    document.getElementById('config-corner').addEventListener('input', (e) => {
      document.getElementById('corner-value').textContent = e.target.value;
    });
    document.getElementById('config-empty').addEventListener('input', (e) => {
      document.getElementById('empty-value').textContent = e.target.value;
    });
    document.getElementById('config-mono').addEventListener('input', (e) => {
      document.getElementById('mono-value').textContent = e.target.value;
    });
    
    // 帮助弹窗
    document.getElementById('link-help').addEventListener('click', (e) => {
      e.preventDefault();
      helpModal.classList.remove('hidden');
    });
    
    document.getElementById('btn-close-help').addEventListener('click', () => {
      helpModal.classList.add('hidden');
    });
    
    // 点击遮罩关闭
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        helpModal.classList.add('hidden');
      }
    });
    
    // 排行榜标签切换
    document.querySelectorAll('.rank-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rank-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.dataset.tab === 'local') {
          RankSystem.renderHighScores();
        } else {
          RankSystem.renderHistory();
        }
      });
    });
    
    // 保存成绩按钮
    document.getElementById('btn-save-score').addEventListener('click', () => {
      const score = state.score;
      const maxTile = Math.max(...state.board.flat());
      RankSystem.saveScore(score, maxTile);
      RankSystem.addHistory(score, maxTile);
      alert(`成绩已保存！得分：${score}`);
      document.getElementById('overlay').classList.add('hidden');
    });
    
    // 新游戏按钮
    document.getElementById('btn-new-game').addEventListener('click', () => {
      newGame();
      document.getElementById('overlay').classList.add('hidden');
    });
  }
};

// ── 增强版 AI 算法 ───────────────────────────────
// 重写 evalBoard 函数以支持配置
function evalBoardWithConfig(board) {
  const cfg = AIConfig.current;
  let score = 0;
  
  // 空格数（越高越好）
  const emptyCells = board.flat().filter(x => x === 0).length;
  score += emptyCells * cfg.emptyWeight;
  
  // 角落权重（最大值在角落最好）
  const maxVal = Math.max(...board.flat());
  const corners = [board[0][0], board[0][3], board[3][0], board[3][3]];
  if (corners.includes(maxVal)) {
    score += cfg.cornerWeight;
  }
  
  // 单调性（行和列有序）
  let monoScore = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c] >= board[r][c+1]) monoScore++;
    }
  }
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 3; r++) {
      if (board[r][c] >= board[r+1][c]) monoScore++;
    }
  }
  score += monoScore * cfg.monoWeight / 10;
  
  return score;
}

// ── 初始化 ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  AIConfig.init();
  PanelControl.init();
  
  // 修改原有的 newGame 函数，添加 AI 停止逻辑
  const originalNewGame = newGame;
  newGame = function() {
    stopAI();
    originalNewGame();
  };
});
