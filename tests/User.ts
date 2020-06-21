import {
  Entity,
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
} from "typeorm";
import { ObjectType, InputType, Field } from "graphql-composer-decorators";
import { N } from "graphql-composer";
import { Pet } from "./Pet";

@ObjectType()
@InputType("UserInput")
@Entity("user_entity")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  username: string;

  @Field(() => N(User))
  @OneToOne(() => User, (u) => u.user)
  user?: User;

  @Field(() => N([Pet]))
  @ManyToOne(() => Pet, (p) => p.user)
  pets?: Pet[];
}
