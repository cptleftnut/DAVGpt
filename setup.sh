#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# DAVGpt Termux Dev Setup
# Run: bash setup.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo ""
echo "╔════════════════════════════════╗"
echo "║   Termux Dev Environment Setup ║"
echo "╚════════════════════════════════╝"
echo ""

# ── 1. Update packages ─────────────────────────────────────
info "Updating package list..."
pkg update -y && pkg upgrade -y
log "Packages updated"

# ── 2. Core tools ──────────────────────────────────────────
info "Installing core tools..."
pkg install -y \
  git \
  curl \
  wget \
  unzip \
  zip \
  vim \
  nano \
  openssh \
  zsh \
  python \
  python-pip
log "Core tools installed"

# ── 3. Node.js ─────────────────────────────────────────────
info "Installing Node.js..."
pkg install -y nodejs
log "Node $(node -v) installed"

# ── 4. Java (OpenJDK 21) ───────────────────────────────────
info "Installing Java 21..."
pkg install -y openjdk-21
export JAVA_HOME=$PREFIX/lib/jvm/java-21
log "Java $(java -version 2>&1 | head -1) installed"

# ── 5. Useful npm globals ──────────────────────────────────
info "Installing global npm tools..."
npm install -g yarn typescript ts-node --silent
log "yarn, typescript, ts-node installed"

# ── 6. Oh My Zsh ──────────────────────────────────────────
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  info "Installing Oh My Zsh..."
  RUNZSH=no CHSH=no sh -c \
    "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
  log "Oh My Zsh installed"
else
  log "Oh My Zsh already installed"
fi

# ── 7. Zsh plugins ────────────────────────────────────────
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
  info "Installing zsh-autosuggestions..."
  git clone https://github.com/zsh-users/zsh-autosuggestions \
    "$ZSH_CUSTOM/plugins/zsh-autosuggestions" -q
fi

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
  info "Installing zsh-syntax-highlighting..."
  git clone https://github.com/zsh-users/zsh-syntax-highlighting \
    "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" -q
fi
log "Zsh plugins installed"

# ── 8. Write .zshrc ───────────────────────────────────────
info "Writing .zshrc..."
cat > "$HOME/.zshrc" << 'ZSHRC'
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="agnoster"
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
  node
  npm
)
source $ZSH/oh-my-zsh.sh

# ── Java ─────────────────────────────────
export JAVA_HOME=$PREFIX/lib/jvm/java-21
export PATH="$JAVA_HOME/bin:$PATH"

# ── Node / npm ───────────────────────────
export PATH="$PREFIX/bin:$HOME/.npm-global/bin:$PATH"
export npm_config_prefix="$HOME/.npm-global"

# ── Aliases: Navigation ──────────────────
alias ..='cd ..'
alias ...='cd ../..'
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# ── Aliases: Git ─────────────────────────
alias g='git'
alias gs='git status'
alias ga='git add .'
alias gc='git commit -m'
alias gp='git push'
alias gpl='git pull'
alias gl='git log --oneline -10'
alias gco='git checkout'
alias gcb='git checkout -b'
alias gac='git add . && git commit -m'
alias gacp='git add . && git commit -m $1 && git push'

# ── Aliases: Node / npm ──────────────────
alias ni='npm install'
alias nr='npm run'
alias nd='npm run dev'
alias nb='npm run build'
alias nlg='npm list -g --depth=0'

# ── Aliases: Yarn ────────────────────────
alias y='yarn'
alias ya='yarn add'
alias yd='yarn dev'
alias yb='yarn build'

# ── Aliases: Dev shortcuts ───────────────
alias py='python'
alias pip='pip3'
alias cls='clear'
alias reload='source ~/.zshrc'
alias zshconfig='nano ~/.zshrc'
alias hosts='nano /etc/hosts'

# ── Aliases: Termux specific ─────────────
alias storage='termux-setup-storage'
alias share='cd /sdcard'
alias download='cd /sdcard/Download'

# ── Functions ────────────────────────────
mkcd() { mkdir -p "$1" && cd "$1"; }
gclone() { git clone "$1" && cd "$(basename "$1" .git)"; }
serve() { python -m http.server "${1:-8080}"; }

# ── Welcome message ──────────────────────
echo ""
echo "  🤖 Termux Dev Ready"
echo "  Node: $(node -v)  |  Java: $(java -version 2>&1 | awk -F '"' '{print $2}' | head -1)"
echo "  Type 'alias' to see all shortcuts"
echo ""
ZSHRC
log ".zshrc written"

# ── 9. Set zsh as default shell ───────────────────────────
info "Setting zsh as default shell..."
chsh -s zsh 2>/dev/null || true
log "Default shell set to zsh"

# ── 10. Storage access ────────────────────────────────────
info "Setting up storage access..."
termux-setup-storage 2>/dev/null || warn "Run 'termux-setup-storage' manually to grant storage"

echo ""
echo "╔════════════════════════════════════╗"
echo "║  ✅  Setup complete!               ║"
echo "║                                    ║"
echo "║  Run: source ~/.zshrc              ║"
echo "║  Or restart Termux                 ║"
echo "╚════════════════════════════════════╝"
echo ""
echo "Installed:"
echo "  • zsh + oh-my-zsh (theme: agnoster)"
echo "  • zsh-autosuggestions"
echo "  • zsh-syntax-highlighting"
echo "  • Node $(node -v)"
echo "  • Java 21"
echo "  • yarn, typescript, ts-node"
echo "  • git aliases (gs, ga, gc, gp, gac...)"
echo "  • dev aliases (ni, nr, nd, nb, y, yd...)"
echo ""
