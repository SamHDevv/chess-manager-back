import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import type { User } from "./User";
import type { Tournament } from "./Tournament";

@Entity("inscriptions")
export class Inscription {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  tournamentId!: number;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  registrationDate!: Date;

  // Relaciones
  @ManyToOne(() => require("./User").User, (user: User) => user.inscriptions)
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne(() => require("./Tournament").Tournament, (tournament: Tournament) => tournament.inscriptions)
  @JoinColumn({ name: "tournamentId" })
  tournament!: Tournament;
}