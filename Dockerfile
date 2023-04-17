FROM node:18
WORKDIR /app
ADD . /app
RUN yarn
RUN yarn build
CMD ./startup.sh