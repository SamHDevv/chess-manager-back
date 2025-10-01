import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Inscription } from "./Inscription";

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
  @OneToMany(() => Inscription, inscription => inscription.user)
  inscriptions!: Inscription[];
}
