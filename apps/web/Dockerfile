# Build context is the repo root, so pnpm can resolve the workspace lockfile.
FROM node:22-slim AS build
RUN npm install -g pnpm@10.6.5
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @hybrid-product-search/web
COPY apps/web apps/web
# Next.js bakes rewrites in at build time, so the API address is a build argument.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @hybrid-product-search/web build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3100
CMD ["node", "apps/web/server.js"]
