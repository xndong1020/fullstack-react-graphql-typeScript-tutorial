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
class FieldError {
  @Field()
  field: string;
  @Field(() => String)
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => User, { nullable: true })
  user?: User;

  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
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
  async me(@Ctx() { em, req }: MyContext): Promise<UserResponse> {
    if (!req.session.userId)
      return {
        user: undefined,
      };
    const userInDb = await em.findOne(User, { id: req.session.userId });
    if (!userInDb)
      return {
        user: undefined,
      };

    return {
      user: userInDb,
    };
  }

  @Query(() => UserResponse)
  async login(
    @Arg("input") input: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = input;
    if (!username || !password)
      return {
        user: undefined,
        errors: [
          {
            field: "usernameOrPassword",
            message: "username/password is requried",
          },
        ],
      };
    const userInDb = await em.findOne(User, { username });
    if (!userInDb)
      return {
        errors: [
          { field: "usernameOrPassword", message: "invalid username/password" },
        ],
      };

    const isPasswordValid = await argon2.verify(userInDb.password, password);

    if (!isPasswordValid)
      return {
        errors: [
          { field: "usernameOrPassword", message: "invalid username/password" },
        ],
      };

    req.session.userId = userInDb.id;

    return {
      user: userInDb,
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
        errors: [
          {
            field: "usernameOrPassword",
            message: "username/password is requried",
          },
        ],
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
      };
    } catch (error) {
      return {
        errors: [{ field: "usernameOrPassword", message: error.message }],
      };
    }
  }
}
