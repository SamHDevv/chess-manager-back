import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { Tournament } from "./Tournament";

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
  @ManyToOne(() => User, user => user.inscriptions)
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne(() => Tournament, tournament => tournament.inscriptions)
  @JoinColumn({ name: "tournamentId" })
  tournament!: Tournament;
}