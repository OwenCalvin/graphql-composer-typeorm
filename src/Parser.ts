import {
  ClassType,
  Context,
  InputType,
  NullableType,
  InputFieldType,
  RequiredType,
} from "graphql-composer";
import { MetadataStorage } from "graphql-composer-decorators";
import { createQueryBuilder, getMetadataArgsStorage } from "typeorm";
import { SelectionNode } from "graphql";
import { ArgsFactory, StringArgument, NumberArgument } from "./ArgsFactory";

export class Parser<Type extends ClassType> {
  private _classType: Type;
  private _args: () => InputType;
  private _computedArgs: InputType;

  get classType() {
    return this._classType;
  }

  constructor(classType: Type, args: () => InputType) {
    this._classType = classType;
    this._args = args;
  }

  private get computedArgs() {
    if (!this._computedArgs) {
      this._computedArgs = this._args();
    }
    return this._computedArgs;
  }

  getRelationPath(item: string) {
    const name = `${this._classType.name}.${item}`;
    const nameArgs = name.split(/\./g);
    const prop = nameArgs[nameArgs.length - 1];
    nameArgs.splice(nameArgs.length - 1, 1);
    return `${nameArgs.join("_")}.${prop}`;
  }

  async buildQuery(ctx: Context) {
    const args: ArgsFactory<any> = ctx.rawArgs as any;
    const where: any = args.where;
    const relations = await this.getRelations(ctx);
    const query = createQueryBuilder<InstanceType<Type>>(
      this._classType as any,
      this._classType.name,
    );

    if (args.orders !== undefined) {
      args.orders.map((item) => {
        query.addOrderBy(this.getRelationPath(item.field), item.order);
      });
    }

    if (args.limit !== undefined && args.skip !== undefined) {
      query.limit(args.limit);
      query.offset(args.skip);
    }

    relations.map((item) => {
      const relationName = this.getRelationPath(item);
      query.leftJoinAndSelect(relationName, relationName.replace(/\./g, "_"));
    });

    if (args.where !== undefined) {
      const parseWhere = (
        object: Object,
        inputType?: InputFieldType,
        parent?: string,
      ) => {
        Object.keys(object).map((key) => {
          const value = object[key];
          if (inputType instanceof InputType) {
            const field = inputType.fields.find((f) => f.name === key);
            const type = Parser.unwrapModifiedType(field.type);
            const propName = `${parent}.${key}`;
            if (type instanceof InputType) {
              switch (type.name) {
                case "StringArgument":
                  const strArg = value as StringArgument;
                  if (strArg.eq !== undefined) {
                    query.andWhere(`${propName} = :${key}`, {
                      [key]: strArg.eq,
                    });
                  } else if (strArg.like !== undefined) {
                    query.andWhere(`${propName} LIKE :${key}`, {
                      [key]: strArg.like,
                    });
                  }
                  return;
                case "NumberArgument":
                  const nbArg = value as NumberArgument;
                  if (nbArg.eq !== undefined) {
                    query.andWhere(`${propName} = :${key}`, {
                      [key]: nbArg.eq,
                    });
                  } else if (nbArg.gt !== undefined) {
                    query.andWhere(`${propName} > :${key}`, {
                      [key]: nbArg.gt,
                    });
                  } else if (nbArg.gte !== undefined) {
                    query.andWhere(`${propName} >= :${key}`, {
                      [key]: nbArg.gte,
                    });
                  } else if (nbArg.lt !== undefined) {
                    query.andWhere(`${propName} < :${key}`, {
                      [key]: nbArg.lt,
                    });
                  } else if (nbArg.lte !== undefined) {
                    query.andWhere(`${propName} <= :${key}`, {
                      [key]: nbArg.lte,
                    });
                  }
                  return;
              }
            } else {
              query.andWhere(`${propName} = :${key}`, {
                [key]: value,
              });
            }
            parseWhere(value, type, `${parent}_${key}`);
          }
        });
      };

      parseWhere(
        where,
        (this._computedArgs.fields.find((f) => f.name === "where")
          .type as NullableType<InputType>).type,
        this._classType.name,
      );
    }

    return query;
  }

  private async getRelations(ctx: Context) {
    const selections = ctx.infos.fieldNodes[0].selectionSet.selections;

    const relationsWhere = await this.parseWhereToRelations(ctx.rawArgs.where);
    const relationsSelection = await this.parseSelectionsToRelations(
      this._classType,
      selections,
    );

    let relations: string[] = [...relationsWhere, ...relationsSelection];

    relations = relations.filter(
      (item, index) => relations.indexOf(item) === index,
    );
    return relations;
  }

  private async parseWhereToRelations(where: any) {
    const relations: string[] = [];
    const ormMetadatas = getMetadataArgsStorage();
    const args = ((this.computedArgs.fields.find((f) => f.name === "where")
      .type as NullableType).type as any) as InputType;

    if (where === undefined) {
      return relations;
    }

    const parse = async (obj: Object, args: InputType, parent?: string) => {
      if (!obj) {
        return;
      }

      Object.keys(obj).map((key) => {
        if (typeof obj[key] === "object" && obj[key]) {
          const relation = ormMetadatas.relations.find((relation) => {
            return relation.propertyName === key;
          });
          if (relation) {
            const table = ormMetadatas.tables.find((t) => {
              return t.target === (relation as any).type();
            });
            if (table) {
              const prefix = parent ? `${parent}.` : "";
              const relationName = prefix + relation.propertyName;
              relations.push(relationName);

              const field = args.fields.find((f) => f.name === key);
              if (field) {
                const t = Parser.unwrapModifiedType(field.type);
                parse(obj[key], t, relationName);
              }
            }
          }
        }
      });
    };

    await parse(where, args);

    return relations;
  }

  private async parseSelectionsToRelations(
    classType: ClassType,
    selections: Readonly<SelectionNode[]>,
  ) {
    const relations = [];
    const ormMetadatas = getMetadataArgsStorage();
    const objectType = MetadataStorage.instance.classTypeMap.get(classType)
      .object;

    if (!objectType) {
      throw new Error(
        `You should decorate the class ${classType.name} with @ObjectType`,
      );
    }

    const parse = async (selections, parent?: string) => {
      selections.map((selection: any) => {
        if (!selection.selectionSet) {
          return;
        }
        const relationInfos = ormMetadatas.relations.find((item) => {
          return item.propertyName === selection.name.value;
        });
        if (relationInfos) {
          const relationType = (relationInfos.type as any)();

          const relation = ormMetadatas.tables.find((item) => {
            return item.target === relationType;
          });

          if (relation) {
            const prefix = parent ? `${parent}.` : "";
            const relationName = prefix + relationInfos.propertyName;
            relations.push(relationName);
            parse(selection.selectionSet.selections, relationName);
          }
        }
      });
    };

    await parse(selections);
    return relations;
  }

  static unwrapModifiedType<T = any>(fieldType: T) {
    let type: any = fieldType;

    if (type instanceof NullableType) {
      type = type.type as InputType;
    }
    if (type instanceof RequiredType) {
      type = type.type as InputType;
    }
    if (Array.isArray(type)) {
      type = type[0] as InputType;
    }
    return type;
  }
}
