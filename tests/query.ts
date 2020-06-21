import {
  Resolver,
  Query,
  Field,
  Schema,
  Args,
  ObjectType,
} from "graphql-composer-decorators";
import { createConnection } from "typeorm";
import { ApolloServer } from "apollo-server";
import { Context } from "graphql-composer";
import { ArgsFactory, Parser } from "../src";
import { User } from "./User";
import { Pet } from "./Pet";
import { Bug } from "./Bug";

@ObjectType()
class Response {
  @Field()
  response: string;
}

const args = ArgsFactory.create(User);
const parser = new Parser(User, args);

@Resolver()
class R {
  @Query()
  getUser(@Args(args) args: ArgsFactory<User>, ctx: Context): User {
    console.log(args);
    const query = parser.buildQuery(ctx);
    return new User();
  }
}

(async () => {
  await createConnection({
    type: "mysql",
    username: "root",
    password: "12345678",
    database: "test",
    entities: [User, Pet, Bug],
    synchronize: true,
  });

  const schema = Schema.create()
    .load()
    .addTypes(...ArgsFactory.types)
    .setConfig({ requiredByDefault: true })
    .build();

  const server = new ApolloServer({ schema });
  await server.listen(4000);
})();
