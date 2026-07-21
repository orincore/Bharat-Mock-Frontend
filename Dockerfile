# syntax=docker/dockerfile:1
# Next.js standalone build. NEXT_PUBLIC_* vars are inlined into the client
# bundle at BUILD time, not read at runtime — they're passed as --build-arg
# from CI (see .github/workflows/deploy-frontend.yml) and must be re-declared
# as ARG+ENV here, or they'd silently end up empty in the built pages.

FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json .npmrc ./
RUN npm ci

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID \
    NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache tini \
    && addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-old-space-size=512

# Standalone output copies only the traced production deps + a minimal
# server.js — public/ and .next/static aren't included in it automatically
# and must be copied in separately (this is the documented Next.js pattern,
# not specific to this app).
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public

USER 1001
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
