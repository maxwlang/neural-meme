FROM node:18
WORKDIR /app
ADD . /app
RUN apt update
RUN apt install -y graphicsmagick
RUN yarn
RUN yarn build
CMD yarn start