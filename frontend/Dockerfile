FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copiamos el resto de los archivos del frontend
COPY . .

# Exponemos el puerto de Vite usado en desarrollo / o Nginx en producción
EXPOSE 80

# En este caso para la fase de desarrollo/testing levantaremos vite con host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80"]
