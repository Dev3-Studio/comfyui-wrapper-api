FROM node:lts-alpine

# Set the working directory for the api
WORKDIR /api

# Copy the wrapper api code into the container
COPY build ./build
COPY package.json .
COPY tsconfig.json .

# Install Node.js dependencies
RUN npm install --force --omit=dev

ENV PORT=3000
ENV COMFY_UI_HOST=127.0.0.1
ENV COMFY_UI_PORT=8188

# Set the port
EXPOSE $PORT

# Run npm start
CMD ["npm", "start"]