FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copiamos el resto de los archivos
COPY . .

# Comando por defecto para desarrollo usando ts-node-dev o nodemon
# Esto será sobrescrito posteriormente para producción
EXPOSE 3000

CMD ["npm", "run", "dev"]
