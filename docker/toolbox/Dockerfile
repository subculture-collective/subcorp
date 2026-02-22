# Toolbox — agent execution environment
# Provides a full programmer + security researcher toolkit.
# Runs as a sidecar container; the unified worker uses `docker exec` to run commands.
FROM debian:bookworm-slim

# ── Core system + Dev essentials ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Networking & fetching
    curl wget jq ca-certificates gnupg dnsutils net-tools iputils-ping whois \
    # Core utilities
    coreutils findutils diffutils patch gawk sed grep less file unzip zip tar gzip bzip2 xz-utils xxd \
    # Text processing & editing
    vim-tiny nano \
    # Development — compilers & build tools
    git make cmake gcc g++ \
    # Python
    python3 python3-pip python3-venv python3-dev \
    # Ruby
    ruby \
    # Search tools
    ripgrep fd-find \
    # Process & system
    procps htop tree strace ltrace \
    # Database clients
    postgresql-client sqlite3 \
    # SSH
    openssh-client \
    # Shell analysis
    shellcheck \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 22 ──
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

# ── GitHub CLI ──
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list \
    && apt-get update && apt-get install -y gh && rm -rf /var/lib/apt/lists/*

# ── Go ──
RUN ARCH=$(dpkg --print-architecture) \
    && curl -fsSL "https://go.dev/dl/go1.23.6.linux-${ARCH}.tar.gz" | tar -C /usr/local -xzf -
ENV PATH="/usr/local/go/bin:/root/go/bin:$PATH"

# ── Security / Pentest tools (apt) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    netcat-openbsd \
    socat \
    tcpdump \
    tshark \
    openssl \
    sslscan \
    hydra \
    john \
    binwalk \
    libimage-exiftool-perl \
    && rm -rf /var/lib/apt/lists/*

# ── Nikto (not in bookworm repos) ──
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto \
    && ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto

# ── Go-based security tools ──
RUN go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest \
    && go install github.com/ffuf/ffuf/v2@latest \
    && go install github.com/OJ/gobuster/v3@latest \
    && go install github.com/projectdiscovery/httpx/cmd/httpx@latest \
    && go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest \
    && rm -rf /root/.cache/go-build /root/go/pkg

# ── Python venv + packages ──
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir \
    # General / scraping
    requests feedparser beautifulsoup4 html2text httpie \
    # Security / pentest
    pwntools scapy impacket paramiko cryptography \
    sqlmap semgrep wfuzz dirsearch \
    # Code analysis
    pylint bandit safety \
    # Data
    pandas

# ── npm global tools ──
RUN npm install -g \
    typescript tsx eslint prettier \
    retire snyk

# ── Copy repo source + init script ──
COPY . /opt/subcult-repo
COPY docker/toolbox/init-workspace.sh /usr/local/bin/init-workspace.sh
RUN chmod +x /usr/local/bin/init-workspace.sh

RUN echo 'umask 0000' > /etc/workspace-env.sh
ENV BASH_ENV=/etc/workspace-env.sh
WORKDIR /workspace
CMD ["/bin/bash", "-c", "/usr/local/bin/init-workspace.sh && exec sleep infinity"]
