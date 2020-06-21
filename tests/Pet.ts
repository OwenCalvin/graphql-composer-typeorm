import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { ObjectType, InputType, Field } from "graphql-composer-decorators";
import { User } from "./User";
import { Bug } from "./Bug";
import { N } from "graphql-composer";

@ObjectType()
@InputType("PetInput")
@Entity("pet_entity")
export class Pet extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  name: string;

  @OneToMany(() => User, (p) => p.pets)
  user?: User;

  @Field(() => N([Bug]))
  @ManyToOne(() => Bug, (p) => p.pet)
  bugs?: Bug[];
}
