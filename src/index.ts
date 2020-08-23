import { MikroORM } from "@mikro-orm/core";
import { __prod__ } from "./constants";
import { Post } from "./entities/Post";

// mikro config
import mikroConfig from "./mikro-orm.config";

const main = async () => {
  try {
    const orm = await MikroORM.init(mikroConfig);
    await orm.getMigrator().up();

    // const post = orm.em.create(Post, { title: "my first post 222" });
    // await orm.em.persistAndFlush(post);

    const posts = await orm.em.find(Post, {});
    console.log("posts", posts);
  } catch (error) {
    console.log("Jeremy error", error);
  }
};

main();
