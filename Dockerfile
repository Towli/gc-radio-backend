FROM node:10.14.1-slim

# Create app directory
WORKDIR /usr/src/

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install --production
# Bundle app source

COPY . .

CMD [ "npm", "run", "start" ]

# for dev, use docker run --network="host" to prevent using the default --network="bridge"
# this lets the docker container reference the local postgres running on a separate docker container