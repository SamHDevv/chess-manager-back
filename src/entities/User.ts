import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import type { Inscription } from "./Inscription";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ 
    type: "enum", 
    enum: ["admin", "player"],
    default: "player"
  })
  role!: "admin" | "player";

  // Relaciones
  @OneToMany(() => require("./Inscription").Inscription, (inscription: Inscription) => inscription.user)
  inscriptions!: Inscription[];
}
