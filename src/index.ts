//  make sure to import it in a global place
import "reflect-metadata";

import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";

import express from "express";
import cors from "cors";

//
import { ApolloServer } from "apollo-server-express";

//
import { buildSchema } from "type-graphql";

//
import { PostResolver } from "./resolvers/post";

// mikro config
import mikroConfig from "./mikro-orm.config";
import { UserResolver } from "./resolvers/user";

// redis
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

const main = async () => {
  try {
    const app = express();

    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient(6379, "192.168.20.39");

    // add cors to all routes
    app.use(
      cors({
        origin: "http://192.168.20.39:3000",
        credentials: true,
      })
    );

    // session middleware has to run before apollo middleware
    // 'secret' will be used to sign your cookie
    // 'disableTouch' is to disable re-saving and reseting the TTL
    app.use(
      session({
        name: "qid",
        store: new RedisStore({
          client: redisClient,
          disableTouch: true,
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 365,
          httpOnly: true,
          sameSite: "lax",
          secure: __prod__,
        },
        saveUninitialized: false,
        secret: "your_cookie_secret_here",
        resave: false,
      })
    );

    // init database based on config file
    const orm = await MikroORM.init(mikroConfig);
    // migrate database automatically rather than manually run it in cli
    // await orm.getMigrator().up();

    const schema = await buildSchema({
      resolvers: [PostResolver, UserResolver],
      validate: false,
    });

    const apolloServer = new ApolloServer({
      schema,
      context: ({ req, res }) => ({ em: orm.em, req, res }),
    });

    apolloServer.applyMiddleware({
      app,
      cors: false,
    });

    app.get("/", (_req, res) => {
      res.send("hello");
    });

    app.listen(4000, () => {
      console.log("[x]: server listening on port 4000");
    });

    // create an Post object, and use entityManater to inject into data
    // note: here the data is not saved into db yet.
    // const post = orm.em.create(Post, { title: "my first post 111" });
    // commit to database
    // await orm.em.persistAndFlush(post);
    // query
    // const posts = await orm.em.find(Post, {});
    // console.log("posts", posts);
  } catch (error) {
    console.log("error", error);
  }
};

main();
