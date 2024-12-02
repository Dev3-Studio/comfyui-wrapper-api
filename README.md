# ComfyUI Wrapper API

## Overview

A lightweight API service that provides a streamlined interface for image generation using ComfyUI workflows, with
intelligent prompt processing and result management.

## 🚀 API Endpoints

### Outputs

- **GET `/outputs/{filename}`**
    - Retrieve generated images
    - Filename format: `<uuid>.png`
    - Responses:
        - `200`: Image successfully retrieved
        - `400`: Bad request
        - `404`: Image not found

### Prompts

- **POST `/prompts`**
    - Create a new image generation prompt
    - Request Body: JSON with prompt details
    - Responses:
        - `201`: Prompt created successfully
        - `400`: Bad request
        - `500`: Server error

- **GET `/prompts/results`**
    - Retrieve prompt generation results
    - Optional Query Parameters:
        - `clientId`: Filter by client UUID
        - `status`: Filter by status (`PENDING`, `COMPLETED`, `FAILED`)
        - `limit`: Result count limit
    - Responses:
        - `200`: Results retrieved
        - `400`: Bad request
        - `500`: Server error

- **GET `/prompts/{id}`**
    - Get specific prompt result
    - Responses:
        - `200`: Prompt found
        - `400`: Bad request
        - `404`: Prompt not found

## 🛠 Setup

```bash
# Clone the repository
git clone https://github.com/your-org/comfyui-wrapper-api.git

# Install dependencies
npm install

# Start the server (development)
npm run dev

# Start the server (production)
npm run build
npm run start
```