FROM node:21.5.0-alpine3.19 as builder
RUN apk add --no-cache bash gettext

# arm64 dependencies
RUN apk add --no-cache python3 pythonispython3 make gcc g++ musl-dev

# Dependencies
WORKDIR /app

COPY . /app

RUN yarn
RUN envsubst < project.template.yaml > project.yaml
RUN yarn codegen
RUN yarn build

RUN rm -Rf /app/node_modules
RUN rm /app/project.yaml

FROM onfinality/subql-node:v3.4.10 as runner

RUN apk add --no-cache bash gettext
RUN addgroup subquery && adduser --uid 1001 -G subquery -D --shell /bin/false subquery

COPY --from=builder /app /app

ENTRYPOINT [ "/sbin/tini", "--", "bash", "/app/deploy/docker-entrypoint.sh" ]

WORKDIR /app

RUN chown -R subquery /app
USER subquery