import {
  Resolver,
  Ctx,
  Arg,
  Mutation,
  InputType,
  Field,
  ObjectType,
  Query,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "src/types";
import argon2 from "argon2";

@ObjectType()
class Error {
  @Field(() => String)
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [Error], { nullable: true })
  errors?: Error[];
}

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@Resolver()
export class UserResolver {
  @Query(() => UserResponse)
  async login(
    @Arg("input") input: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = input;
    if (!username || !password)
      return {
        user: undefined,
        errors: [{ message: "username/password is requried" }],
      };
    const userInDb = await em.findOne(User, { username });
    if (!userInDb)
      return {
        user: undefined,
        errors: [{ message: "invalid username/password" }],
      };

    const isPasswordValid = await argon2.verify(userInDb.password, password);
    if (!isPasswordValid)
      return {
        user: undefined,
        errors: [{ message: "invalid username/password" }],
      };
    return {
      user: userInDb,
      errors: undefined,
    };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input") input: UsernamePasswordInput,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = input;
    if (!username || !password)
      return {
        user: undefined,
        errors: [{ message: "username/password is requried" }],
      };
    const hashedPassword = await argon2.hash(password);
    try {
      const user = await em.create(User, {
        username,
        password: hashedPassword,
      });
      await em.persistAndFlush(user);
      return {
        user,
        errors: undefined,
      };
    } catch (error) {
      return {
        user: undefined,
        errors: [{ message: error.message }],
      };
    }
  }
}
