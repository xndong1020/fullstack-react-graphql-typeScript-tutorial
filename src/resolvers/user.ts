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
import { EntityManager } from "@mikro-orm/postgresql";

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

  @Mutation(() => UserResponse)
  async login(
    @Arg("input") input: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = input;
    if (!username)
      return {
        errors: [
          {
            field: "username",
            message: "username is requried",
          },
        ],
      };
    if (!password) {
      return {
        errors: [
          {
            field: "password",
            message: "password is requried",
          },
        ],
      };
    }
    const userInDb = await em.findOne(User, { username });
    if (!userInDb)
      return {
        errors: [{ field: "username", message: "invalid username/password" }],
      };

    const isPasswordValid = await argon2.verify(userInDb.password, password);

    if (!isPasswordValid)
      return {
        errors: [{ field: "password", message: "invalid username/password" }],
      };

    req.session.userId = userInDb.id;

    return {
      user: userInDb,
    };
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("input") input: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const { username, password } = input;
    if (!username)
      return {
        errors: [
          {
            field: "username",
            message: "username is requried",
          },
        ],
      };
    if (!password) {
      return {
        errors: [
          {
            field: "password",
            message: "password is requried",
          },
        ],
      };
    }
    const hashedPassword = await argon2.hash(password);
    try {
      let user;
      // this 'EntityManager' class is from "@mikro-orm/postgresql"
      const result = await (em as EntityManager)
        .createQueryBuilder(User)
        .getKnexQuery()
        .insert({
          username,
          password: hashedPassword,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
      user = result[0];
      // store user id session
      // this will set a cookie on the user
      // keep them logged in
      req.session.userId = user.id;
      return { user };
    } catch (error) {
      if (error.detail.includes("already exists"))
        return {
          errors: [{ field: "username", message: "username is already taken" }],
        };
      else
        return {
          errors: [
            {
              field: "usernameOrPassword",
              message: error.message,
            },
          ],
        };
    }
  }
}
