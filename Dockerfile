# Etapa base
FROM node:20.19.0-slim

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias (usando legacy-peer-deps si es necesario)
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construir la aplicación
RUN npm run build

# Expone el puerto en que correrá NestJS
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start:prod"]
