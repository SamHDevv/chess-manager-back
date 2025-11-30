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

  // Campos para soft delete y anonimización
  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ type: "datetime", nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true })
  originalName?: string; // Para auditoría interna

  // Relaciones
  @OneToMany(() => require("./Inscription").Inscription, (inscription: Inscription) => inscription.user)
  inscriptions!: Inscription[];
}
