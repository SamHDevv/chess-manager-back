import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import type { Match } from "./Match";
import type { Inscription } from "./Inscription";

@Entity("tournaments")
export class Tournament {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "datetime" })
  startDate!: Date;

  @Column({ type: "datetime" })
  endDate!: Date;

  @Column()
  location!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  maxParticipants?: number;

  @Column({ type: "datetime", nullable: true })
  registrationDeadline?: Date;

  @Column({ 
    type: "enum", 
    enum: ["upcoming", "ongoing", "finished", "cancelled"],
    default: "upcoming"
  })
  status!: "upcoming" | "ongoing" | "finished" | "cancelled";

  // Relaciones
  @OneToMany(() => require("./Match").Match, (match: Match) => match.tournament)
  matches!: Match[];

  @OneToMany(() => require("./Inscription").Inscription, (inscription: Inscription) => inscription.tournament)
  inscriptions!: Inscription[];
}