FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY game ./game
COPY server ./server
ENV PORT=3000
# Sugerencias y bugs: se guardan en DATA_DIR. En Northflank monta un volumen
# persistente en /data para que sobrevivan a reinicios y despliegues.
ENV DATA_DIR=/data
RUN mkdir -p /data
EXPOSE 3000
# Montón de memoria acotado para un contenedor de 512 MB (el juego usa ~120 MB).
CMD ["node", "--max-old-space-size=320", "server/node.js"]
