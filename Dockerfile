FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PUBLIC_DIR=/app/public
ENV DATA_DIR=/app/data
ENV MAX_PAYLOAD_BYTES=26214400
ENV MAX_UPLOAD_BYTES=10485760
COPY package.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm install --omit=dev \
  && npm cache clean --force
COPY server.js ./server.js
COPY public ./public
RUN mkdir -p /app/data/rooms && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "server.js"]
