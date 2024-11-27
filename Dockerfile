FROM node:lts-alpine

# Set the working directory for the api
WORKDIR /api

# Copy the wrapper api code into the container
COPY src .
COPY package.json .
COPY tsconfig.json .

# Install Node.js dependencies
RUN npm install

# Run build
RUN npm run build

# Setup sqlite database
RUN npx drizzle-kit push

# Set the port
EXPOSE $PORT

# Run npm start
CMD ["npm", "start"]