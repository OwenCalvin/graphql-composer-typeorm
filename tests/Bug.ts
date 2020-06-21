import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { ObjectType, InputType, Field } from "graphql-composer-decorators";
import { Pet } from "./Pet";

@ObjectType()
@InputType("BugInput")
@Entity("bug_entity")
export class Bug extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  name: string;

  @OneToMany(() => Pet, (p) => p.bugs)
  pet?: Pet;
}
