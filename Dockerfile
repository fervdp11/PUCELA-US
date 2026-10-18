FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY game ./game
COPY server ./server
ENV PORT=3000
ENV PUCELA_DATA_DIR=/data
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3000
# Montón de memoria acotado para un contenedor de 512 MB (el juego usa ~100 MB).
CMD ["node", "--max-old-space-size=320", "server/node.js"]
