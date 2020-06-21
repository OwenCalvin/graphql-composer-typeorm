<p align="center">
  <img src="https://raw.githubusercontent.com/OwenCalvin/graphql-composer-decorators/master/docs/.vuepress/public/logo.png" width="150px">
  <h1 align="center">
    <p align="center">
      graphql-composer-decorators
    </p>
    <h3 align="center">
      Create your GraphQL API using decorators!
    </h3>
  </h1>
  <br/>
</p>

# graphql-composer-decorators
GraphQL comes to revolutionize backend development, the fact that you have to declare types is something very useful, however it can lead to code duplication and therefore affect the stability of your application. Indeed, based on the DRY (Don't Repeat Yourself) principle, the fact of declaring several times the same element in a different way should be avoided, because when this element changes it is necessary to modify several parts of code, so if only one of these parts is omitted it can cause problems in your application and the more it grows the harder it will be to maintain it.

### [Go to the documentation](https://owencalvin.github.io/graphql-composer-decorators/)

# graphql-composer
The `graphql-composer-decorators` module is broken down into two modules instead of making one heavier, `graphql-composer` simply provides a compositing API which allows you to create an API using the builder design pattern and compositing.
> Documentation for this module will be available soon.

# graphql-composer-typeorm
This solution offers a way to create advanced queries with TypeORM and graphql-composer-decorators

# `ArgsFactory`
This class allows to generate complex arguments from a class, the arguments will be generated in order to be able to specify several parameters for certain types:

## `string`
### `eq`
strictly equal value
### `like`
expression value

## `number`
### `eq`
strictly equal value
### `gt`
strictly higher value
### `gte`
greater or equal value
### `lt`
strictly speaking, smaller value
### `lte`
lesser or equal value

# `Parser`
This class allows you to generate the SQL query via your arguments:

# Example
```ts
const args = ArgsFactory.create(User)

@Resolver()
class Resolver {
  @Query()
  query(
    Args(args) args: KeyValue,
    ctx: Context
  ): Response {
    const query = parser.buildQuery(ctx);
    return query.getMany();
  }
}
```
