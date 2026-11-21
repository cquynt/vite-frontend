# Test cho dockerfile.yml
# ruleid: ai-dockerfile-from-not-pinned
FROM node:22-alpine
# ok: ai-dockerfile-from-not-pinned
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
# ruleid: ai-dockerfile-curl-pipe-shell
RUN curl -fsSL https://example.com/install.sh | sh
# ok: ai-dockerfile-curl-pipe-shell
RUN curl -fsSLo /tmp/x https://example.com/x
