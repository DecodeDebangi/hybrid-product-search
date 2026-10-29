FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=120 \
    HF_HOME=/models \
    PATH=/app/.venv/bin:$PATH

# Optional dependency groups from pyproject.toml, e.g. `ingest` for the indexing job.
ARG EXTRAS=""

# Dependencies first, so code changes don't reinstall torch.
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project ${EXTRAS:+--extra $EXTRAS}
COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev ${EXTRAS:+--extra $EXTRAS}

# Bake the CLIP weights into the image so containers start without a download.
RUN python -c "from product_search_ml.embedder import ClipEmbedder; ClipEmbedder('cpu')"

EXPOSE 8001
CMD ["product-search-embedder"]
