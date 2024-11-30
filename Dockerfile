FROM node:lts-alpine

# Set the working directory for the api
WORKDIR /api

# Copy the wrapper api code into the container
COPY src src
COPY package.json .
COPY package-lock.json .
COPY tsconfig.json .
COPY drizzle.config.ts .

# Install Node.js dependencies
RUN npm config set strict-ssl false
RUN npm install

# Run build
RUN npm run build

# Setup sqlite database
ENV DB_FILE_NAME=file:local.db

# Set the port
EXPOSE $PORT

# Run npm start
CMD ["npm", "start"]