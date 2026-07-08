FROM node:lts-slim

WORKDIR /app

COPY package*.json ./

# Instalar dependencias necesarias
RUN apt-get update && apt-get install -y \
    libaio1 \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget && npm install

COPY . /app

# Configurar Oracle Instant Client
RUN mkdir -p /opt/oracle && \
    mv /app/instantclient_11_2 /opt/oracle && \
    mkdir -p /opt/oracle/instantclient_11_2/network/admin && \
    cd /opt/oracle/instantclient_11_2 && \
    ln -s libclntsh.so.11.1 libclntsh.so && \
    ln -s libocci.so.11.1 libocci.so && \
    mv /app/tnsnames.ora /opt/oracle/instantclient_11_2/network/admin && \
    echo "/opt/oracle/instantclient_11_2" > /etc/ld.so.conf.d/oracle-instantclient.conf && \
    ldconfig

# Agregar Oracle Instant Client al PATH del sistema
RUN echo "export LD_LIBRARY_PATH=/opt/oracle/instantclient_11_2:\$LD_LIBRARY_PATH" >> /etc/profile.d/oracle-instantclient.sh

# Compilar TypeScript
RUN npm run build

EXPOSE 80

CMD ["npm", "start"]