FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bullseye

ENV DEBIAN_FRONTEND=noninteractive
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH=/usr/local/cargo/bin:${PATH}

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fish \
        ripgrep \
        jq \
        fd-find \
        tree \
        less \
        curl \
        wget \
        zip \
        unzip \
        rsync \
        procps \
        lsof \
        netcat-openbsd \
        build-essential \
        pkg-config \
        libssl-dev \
        ca-certificates \
    && ln -sf /usr/bin/fdfind /usr/local/bin/fd \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --profile minimal --default-toolchain stable

RUN cargo --version \
    && rustc --version \
    && cargo install --locked tbdflow