FROM node:lts-alpine

# Set the working directory
WORKDIR /app

# Install Node.js dependencies
COPY package.json .
COPY package-lock.json .
RUN npm config set strict-ssl false
RUN npm install

# Copy the build into the working directory
COPY src src
COPY tsconfig.json .
COPY drizzle.config.ts .

# Run build
RUN npm run build

# Copy static files
COPY src/static build/static

# Setup sqlite database
ENV DB_FILE_NAME=file:local.db

# Set the port
EXPOSE $PORT

# Run npm start
CMD ["npm", "start"]