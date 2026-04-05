// Shop page logic
window.Shop = {
  themes: [
    { id: 'default', name: 'Default', cost: 0, description: 'Minimal card, ruled lines, light grey border' },
    { id: 'paper', name: 'Paper', cost: 5, description: 'Warm cream bg, subtle texture, slightly rough border' },
    { id: 'glow', name: 'Neon Glow', cost: 20, description: 'Dark card, neon cyan/green glow, text glows' },
    { id: 'typewriter', name: 'Typewriter', cost: 15, description: 'Off-white card, monospace, aged look' },
    { id: 'void', name: 'The Void', cost: 30, description: 'Pure black card, white text, red cursor' },
    { id: 'linen', name: 'Linen', cost: 25, description: 'Warm linen texture, soft taupe tones' }
  ],

  init() {
    this.pointsBalance = document.querySelector('.points-balance');
    this.themesGrid = document.querySelector('.themes-grid');

    this.applySavedSettings();
    this.updatePointsBalance();
    this.renderThemes();
    this.setupSidebar();
  },

  applySavedSettings() {
    const colorway = Data.getState('activeColorway');
    const font = Data.getState('activeFont');
    document.body.className = `${colorway} font-${font}`;
  },

  updatePointsBalance() {
    const points = Data.getPoints();
    if (this.pointsBalance) {
      this.pointsBalance.textContent = `${points} points`;
    }
  },

  renderThemes() {
    this.themesGrid.innerHTML = '';

    this.themes.forEach(theme => {
      const card = document.createElement('div');
      card.className = 'theme-card';

      const preview = document.createElement('div');
      preview.className = `shop-preview-card theme-${theme.id}`;
      preview.innerHTML = '<div class="preview-sample-text">just thinking<br>out loud...</div>';

      const info = document.createElement('div');
      info.className = 'theme-info';

      const name = document.createElement('div');
      name.className = 'theme-name';
      name.textContent = theme.name;

      const cost = document.createElement('div');
      cost.className = 'theme-cost';
      if (theme.cost === 0) {
        cost.textContent = 'Free';
      } else {
        cost.textContent = `${theme.cost} pts`;
      }

      const button = document.createElement('button');
      button.className = 'theme-btn';

      // Determine button state
      const hasPurchased = Data.hasTheme(theme.id);
      const isActive = Data.getState('activeNotebookTheme') === theme.id;
      const points = Data.getPoints();

      if (isActive) {
        button.textContent = 'Equipped';
        button.classList.add('active');
        button.disabled = true;
      } else if (hasPurchased) {
        button.textContent = 'Equip';
        button.addEventListener('click', () => this.equipTheme(theme.id));
      } else if (points >= theme.cost) {
        button.textContent = 'Buy';
        button.addEventListener('click', () => this.buyTheme(theme.id, theme.cost));
      } else {
        button.textContent = 'Locked';
        button.classList.add('locked');
        button.disabled = true;
        const lockInfo = document.createElement('div');
        lockInfo.className = 'lock-info';
        lockInfo.textContent = `Need ${theme.cost - points} more pts`;
        info.appendChild(lockInfo);
      }

      info.appendChild(name);
      info.appendChild(cost);
      info.appendChild(button);

      card.appendChild(preview);
      card.appendChild(info);
      this.themesGrid.appendChild(card);
    });
  },

  buyTheme(id, cost) {
    const currentPoints = Data.getPoints();
    if (currentPoints >= cost) {
      Data.setState('points', currentPoints - cost);
      Data.purchaseTheme(id);
      this.updatePointsBalance();
      this.renderThemes();

      // Show toast
      const toast = document.createElement('div');
      toast.className = 'points-toast';
      toast.textContent = `Purchased!`;
      toast.style.top = '30px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 1500);
    }
  },

  equipTheme(id) {
    Data.equipTheme(id);
    this.renderThemes();
  },

  setupSidebar() {
    const toggleStrip = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');

    if (toggleStrip && sidebar) {
      toggleStrip.addEventListener('click', () => {
        sidebar.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleStrip.contains(e.target)) {
          sidebar.classList.remove('active');
        }
      });

      // Font options
      document.querySelectorAll('.font-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const fontId = btn.dataset.font;
          document.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          Data.equipFont(fontId);
          const bodyClass = document.body.className;
          const newClass = bodyClass.replace(/font-[\w-]+/, `font-${fontId}`);
          document.body.className = newClass;
        });
      });

      // Colorway options
      document.querySelectorAll('.colorway-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          const colorway = swatch.dataset.colorway;
          document.querySelectorAll('.colorway-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          Data.equipColorway(colorway);
          const bodyClass = document.body.className;
          const newClass = bodyClass.replace(/\b(dusk|midnight|fog|paper|forest)\b/, colorway);
          document.body.className = newClass;
        });
      });

      // Highlight active options on load
      const activeFont = Data.getState('activeFont');
      const activeColorway = Data.getState('activeColorway');
      document.querySelector(`.font-option[data-font="${activeFont}"]`)?.classList.add('active');
      document.querySelector(`.colorway-swatch[data-colorway="${activeColorway}"]`)?.classList.add('active');
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  Shop.init();
});
