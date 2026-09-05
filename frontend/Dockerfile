FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values (Supabase URL/anon key, backend API URL) are inlined at
# build time. They are public by design and provided via the .env.local that
# the deploy script uploads alongside this Dockerfile.
RUN npm run build

EXPOSE 7860

# HF Spaces injects PORT=7860
CMD ["sh", "-c", "npm start -- -p ${PORT:-7860}"]
