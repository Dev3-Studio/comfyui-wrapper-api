FROM node:lts

# Set the working directory for the api
WORKDIR /api

# Copy the wrapper api code into the container
COPY src src
COPY package.json .
COPY tsconfig.json .

# Install Node.js dependencies
RUN npm install

# Build typescript
RUN npm run build

ENV PORT=3000
ENV COMFY_UI_HOST=127.0.0.1
ENV COMFY_UI_PORT=8188

# Set the port
EXPOSE $PORT

# Run entrypoint.sh
CMD ["npm", "start"]