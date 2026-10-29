# Build context is the repo root, so pnpm can resolve the workspace lockfile.
FROM node:22-slim AS build
RUN npm install -g pnpm@10.6.5
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/api/package.json services/api/
RUN pnpm install --frozen-lockfile --filter @hybrid-product-search/api
COPY services/api services/api
RUN pnpm --filter @hybrid-product-search/api build \
 && pnpm --filter @hybrid-product-search/api deploy --legacy --prod /out

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production IMAGES_DIR=/data/images
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/services/api/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
