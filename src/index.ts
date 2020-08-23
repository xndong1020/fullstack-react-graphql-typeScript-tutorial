import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";

// mikro config
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  try {
    // init database based on config file
    const orm = await MikroORM.init(mikroConfig);

    // migrate database automatically rather than manually run it in cli
    await orm.getMigrator().up();

    // create an Post object, and use entityManater to inject into data
    // note: here the data is not saved into db yet.
    // const post = orm.em.create(Post, { title: "my first post 222" });

    // commit to database
    // await orm.em.persistAndFlush(post);

    // query
    const posts = await orm.em.find(Post, {});
    console.log("posts", posts);
  } catch (error) {
    console.log("error", error);
  }
};

main();
