######## 构建 ########
FROM --platform=${BUILDPLATFORM:-amd64} node:24-alpine as builder

# 安装构建工具
RUN apk add --update --no-cache ca-certificates curl wget cmake build-base git bash python make gcc g++ zlib-dev autoconf automake file nasm \
  && update-ca-certificates

# YApi 版本
ENV YAPI_VERSION=1.12.0

# 编译脚本
WORKDIR /yapi/scripts
COPY ./docker/release/ ./
RUN npm i && npm run build

# 编译处理 YApi 源码
WORKDIR /yapi/vendors
COPY ./ ./

# 拷贝启动脚本
RUN cp /yapi/scripts/start.js ./start.js

# 执行一些准备工作
RUN node /yapi/scripts/prepare.js $(pwd)

# 安装依赖
RUN npm i

# 清理文件
RUN node /yapi/scripts/clean.js $(pwd)

# 构建应用，这里文件输出到 ./client/dist-prod/
RUN npm run prod:client
RUN cp -r ./client/dist-prod/ ./static/

# 再次清理以删除构建缓存文件
RUN node /yapi/scripts/clean.js $(pwd)

# 删除脚本
RUN rm -rf /yapi/scripts


######## 镜像 ########
FROM node:24-alpine

WORKDIR /yapi

COPY --from=builder /yapi .

EXPOSE 3000

CMD ["node", "/yapi/vendors/start.js"]
