FROM node:20-slim

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
RUN mkdir -p /tmp/vibekit-test

RUN git config --global user.name "opusaku" && \
    git config --global user.email "opusaku@users.noreply.github.com" && \
    git config --global init.defaultBranch main

CMD ["bash"]
