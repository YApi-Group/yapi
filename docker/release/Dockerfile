######## 构建阶段 ########
FROM node:24-alpine AS builder

# 构建期基础工具：python3/make/g++ 供原生模块编译兜底
RUN apk add --update --no-cache python3 make g++

# 编译启动引导脚本 start.ts -> start.js
WORKDIR /yapi/scripts
COPY docker/release/ ./
RUN npm i && npm run build

# 安装依赖（利用镜像层缓存：仅 package.json/lock 变化时才重装）
# root 的 postinstall 会通过 concurrently 同时安装 server/ 与 client/ 的依赖
WORKDIR /yapi/vendors
COPY package.json package-lock.json .npmrc ./
COPY server/package.json server/package-lock.json ./server/
COPY client/package.json client/package-lock.json client/.npmrc ./client/
RUN npm i

# 拷贝源码，构建前端产物并放入服务端静态目录（server/app.js 从 WEB_ROOT/static 提供页面）
COPY . .
RUN npm run prod:client \
  && mkdir -p ./static \
  && cp -r ./client/dist-prod/. ./static/

# 裁剪运行时不需要的内容：
# - client 源码与依赖（构建产物已拷入 static/）
# - 各包的 devDependencies（服务端运行时经 tsx 直接执行 TS 源码，tsx 位于 server 的 dependencies）
# - 本地开发的 config.json 与 init.lock（运行时由 start.js 依据环境变量重新生成配置）
RUN rm -rf ./client ./docs ./dev_resource ./design ./test ./init.lock \
  && echo '{}' > ./config.json \
  && npm prune --omit=dev \
  && cd server && npm prune --omit=dev && cd .. \
  && npm cache clean --force

######## 运行镜像 ########
FROM node:24-alpine

ENV NODE_ENV=production

WORKDIR /yapi
COPY --from=builder /yapi/vendors ./vendors
COPY --from=builder /yapi/scripts/start.js ./start.js

EXPOSE 3000

CMD ["node", "/yapi/start.js"]
