FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY game ./game
COPY server ./server
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/node.js"]
