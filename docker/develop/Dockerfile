# 这个构建文件复制自原版 https://github.com/docker-library/mongo/blob/master/6.0/Dockerfile
# 然后做了一些开发环境的微调

FROM ubuntu:jammy

# add our user and group first to make sure their IDs get assigned consistently, regardless of whatever dependencies get added
RUN set -eux; \
  groupadd --gid 999 --system mongodb; \
  useradd --uid 999 --system --gid mongodb --home-dir /data/db mongodb; \
  mkdir -p /data/db /data/configdb; \
  chown -R mongodb:mongodb /data/db /data/configdb

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  gnupg \
  jq \
  numactl \
  procps \
  ; \
  rm -rf /var/lib/apt/lists/*

# grab gosu for easy step-down from root (https://github.com/tianon/gosu/releases)
ENV GOSU_VERSION 1.16
# grab "js-yaml" for parsing mongod's YAML config files (https://github.com/nodeca/js-yaml/releases)
ENV JSYAML_VERSION 3.13.1

RUN set -ex; \
  \
  savedAptMark="$(apt-mark showmanual)"; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
  wget \
  ; \
  rm -rf /var/lib/apt/lists/*; \
  \
  dpkgArch="$(dpkg --print-architecture | awk -F- '{ print $NF }')"; \
  wget -O /usr/local/bin/gosu "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch"; \
  wget -O /usr/local/bin/gosu.asc "https://github.com/tianon/gosu/releases/download/$GOSU_VERSION/gosu-$dpkgArch.asc"; \
  export GNUPGHOME="$(mktemp -d)"; \
  gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys B42F6819007F00F88E364FD4036A9C25BF357DD4; \
  gpg --batch --verify /usr/local/bin/gosu.asc /usr/local/bin/gosu; \
  gpgconf --kill all; \
  rm -rf "$GNUPGHOME" /usr/local/bin/gosu.asc; \
  \
  wget -O /js-yaml.js "https://github.com/nodeca/js-yaml/raw/${JSYAML_VERSION}/dist/js-yaml.js"; \
  # TODO some sort of download verification here
  \
  apt-mark auto '.*' > /dev/null; \
  apt-mark manual $savedAptMark > /dev/null; \
  apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false; \
  \
  # smoke test
  chmod +x /usr/local/bin/gosu; \
  gosu --version; \
  gosu nobody true

RUN mkdir /docker-entrypoint-initdb.d

RUN set -ex; \
  export GNUPGHOME="$(mktemp -d)"; \
  set -- '39BD841E4BE5FB195A65400E6A26B1AE64C3C388'; \
  for key; do \
  gpg --batch --keyserver keyserver.ubuntu.com --recv-keys "$key"; \
  done; \
  mkdir -p /etc/apt/keyrings; \
  gpg --batch --export "$@" > /etc/apt/keyrings/mongodb.gpg; \
  gpgconf --kill all; \
  rm -rf "$GNUPGHOME"

# Allow build-time overrides (eg. to build image with MongoDB Enterprise version)
# Options for MONGO_PACKAGE: mongodb-org OR mongodb-enterprise
# Options for MONGO_REPO: repo.mongodb.org OR repo.mongodb.com
# Example: docker build --build-arg MONGO_PACKAGE=mongodb-enterprise --build-arg MONGO_REPO=repo.mongodb.com .
ARG MONGO_PACKAGE=mongodb-org
ARG MONGO_REPO=repo.mongodb.org
ENV MONGO_PACKAGE=${MONGO_PACKAGE} MONGO_REPO=${MONGO_REPO}

ENV MONGO_MAJOR 6.0
RUN echo "deb [ signed-by=/etc/apt/keyrings/mongodb.gpg ] http://$MONGO_REPO/apt/ubuntu jammy/${MONGO_PACKAGE%-unstable}/$MONGO_MAJOR multiverse" | tee "/etc/apt/sources.list.d/${MONGO_PACKAGE%-unstable}.list"

# https://docs.mongodb.org/master/release-notes/6.0/
ENV MONGO_VERSION 6.0.6
# 05/04/2023, https://github.com/mongodb/mongo/tree/26b4851a412cc8b9b4a18cdb6cd0f9f642e06aa7

RUN set -x \
  # installing "mongodb-enterprise" pulls in "tzdata" which prompts for input
  && export DEBIAN_FRONTEND=noninteractive \
  && apt-get update \
  && apt-get install -y \
  ${MONGO_PACKAGE}=$MONGO_VERSION \
  ${MONGO_PACKAGE}-server=$MONGO_VERSION \
  ${MONGO_PACKAGE}-shell=$MONGO_VERSION \
  ${MONGO_PACKAGE}-mongos=$MONGO_VERSION \
  ${MONGO_PACKAGE}-tools=$MONGO_VERSION \
  && rm -rf /var/lib/apt/lists/* \
  && rm -rf /var/lib/mongodb \
  && mv /etc/mongod.conf /etc/mongod.conf.orig

VOLUME /data/db

# ensure that if running as custom user that "mongosh" has a valid "HOME"
# https://github.com/docker-library/mongo/issues/524
ENV HOME /data/db

# 额外安装一系列开发依赖
RUN apt update \
  && apt upgrade -y \
  && apt install -y iproute2 openssh-server vim \
  && apt autoremove -y \
  && apt autoclean

# 设置 ssh 配置文件 允许 root 登录
COPY sshd_config /etc/ssh/sshd_config
# 设置 root password
RUN echo 'root:000000' | chpasswd

COPY docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 22 27017
CMD ["mongod"]
