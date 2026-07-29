FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production --ignore-scripts
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
