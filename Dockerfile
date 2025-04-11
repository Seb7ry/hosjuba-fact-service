# Dockerfile
FROM node:20.19.0-slim

# Crear el directorio de trabajo
WORKDIR /app

# Copiar los archivos de dependencia primero
COPY package*.json ./

# Instalar dependencias con legacy-peer-deps
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Exponer el puerto (ajústalo si usas otro en tu .env)
EXPOSE 3000

# Comando para ejecutar la app
CMD ["npm", "run", "start:prod"]
