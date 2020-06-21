import { MetadataStorage } from "graphql-composer-decorators";
import {
  EnumType,
  ClassType,
  InputField,
  N,
  NullableType,
  InputType,
  GQLAnyType,
  KeyValue,
} from "graphql-composer";
import { Parser } from "./Parser";

export enum Orders {
  ASC = "ASC",
  DESC = "DESC",
}

export interface Order {
  field: string;
  order: Orders;
}

export class StringArgument {
  eq?: string;
  like?: string;
}

export class NumberArgument {
  eq?: number;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export class ArgsFactory<T> {
  where: KeyValue;
  limit: number;
  skip: number;
  orders: Order[];

  private static _types: [InputType, InputType][] = [];

  static readonly stringArgument = InputType.create(StringArgument).addFields(
    InputField.create("eq", N(String)),
    InputField.create("like", N(String)),
  );

  static readonly numberArgument = InputType.create(NumberArgument).addFields(
    InputField.create("eq", N(Number)),
    InputField.create("gt", N(Number)),
    InputField.create("gte", N(Number)),
    InputField.create("lt", N(Number)),
    InputField.create("lte", N(Number)),
  );

  static readonly orderEnum = EnumType.create("Orders", Orders);

  static get types(): readonly GQLAnyType[] {
    return [
      this.stringArgument,
      this.numberArgument,
      this.orderEnum,
      ...this._types.map((t) => t[1]),
    ];
  }

  protected constructor() {}

  private static convertFieldIntoArgField(field: InputField) {
    const isArray = Array.isArray(field.type);
    const newField = InputField.create(field.name, N(field.type));
    const type = Parser.unwrapModifiedType(field.type);

    switch (type) {
      case String:
        newField.setType(N(ArgsFactory.stringArgument));
        break;
      case Number:
        newField.setType(N(ArgsFactory.numberArgument));
        break;
    }

    if (type instanceof InputType) {
      const t = ArgsFactory._types.find((t) => t[0].name === type.name);
      if (t) {
        newField.setType(N(t[1]));
      } else {
        const argsType = ArgsFactory.createArgs(
          type.classType,
          `${type.classType.name}Args`,
        );
        newField.setType(N(argsType));
      }
    }

    if (isArray) {
      newField.setType(N([newField.type]));
    }

    return newField;
  }

  private static createArgs<T extends ClassType>(classType: T, name: string) {
    const input = MetadataStorage.instance.classTypeMap.get(classType).input;
    if (!input) {
      return;
    }

    const existing = this._types.find((t) => {
      return t[1].name === name;
    });
    if (existing) {
      return existing[1];
    }

    const newInput = input.copy().setName(name).setClassType(classType);
    ArgsFactory._types.push([input, newInput]);

    newInput.setFields(
      ...input.fields.map(ArgsFactory.convertFieldIntoArgField),
    );

    return newInput;
  }

  static create<T extends ClassType>(classType: T, name?: string) {
    const finalName = name || `${classType.name}Args`;

    const t: () => InputType = () => {
      const newInput = this.createArgs(classType, finalName);

      const args = InputType.create("")
        .addFields(
          InputField.create("where", N(newInput)),
          InputField.create("order", N([ArgsFactory.orderEnum])),
          InputField.create("limit", N(Number)),
          InputField.create("skip", N(Number)),
        )
        .setExtensions({
          decoratorInfos: {
            params: {
              hidden: true,
            },
          },
        });

      return args as any;
    };
    return t;
  }
}
