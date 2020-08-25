import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { ObjectType, Field, Int } from "type-graphql";

@ObjectType()
@Entity({ tableName: "user" })
export class User {
  @Field(() => Int)
  @PrimaryKey()
  id!: number;

  @Field(() => String)
  @Property({ type: "date" })
  createdAt = new Date();

  @Field(() => String)
  @Property({ type: "date", onUpdate: () => new Date() })
  updatedAt = new Date();

  @Field(() => String)
  @Property({ type: "text", unique: true })
  username!: string;

  // without @Field(), means we don't expose this property to graphql
  // it only exists in databse column
  @Property({ type: "text" })
  password!: string;
}
