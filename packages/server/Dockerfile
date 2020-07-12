FROM node:14.4.0

WORKDIR /app
COPY yarn.lock package.json ./

WORKDIR /app/packages/proto
COPY packages/proto/package.json ./
WORKDIR /app/packages/server
COPY packages/server/package.json packages/server/tsconfig.json ./
RUN yarn 

WORKDIR /app/packages/proto
COPY packages/proto/protos protos
COPY packages/proto/scripts scripts
RUN yarn build

WORKDIR /app/packages/server
COPY packages/server/src src
COPY packages/server/bin bin
RUN yarn build

ENTRYPOINT [ "yarn", "ww" ]
