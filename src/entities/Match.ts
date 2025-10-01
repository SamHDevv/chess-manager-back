import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Tournament } from "./Tournament";
import { User } from "./User";

@Entity("matches")
export class Match {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  tournamentId!: number;

  @Column()
  whitePlayerId!: number;

  @Column()
  blackPlayerId!: number;

  @Column({ 
    type: "enum", 
    enum: ["white_wins", "black_wins", "draw", "ongoing", "not_started"],
    default: "not_started"
  })
  result!: "white_wins" | "black_wins" | "draw" | "ongoing" | "not_started";

  @Column({ default: 1 })
  round!: number;

  // Relaciones
  @ManyToOne(() => Tournament, tournament => tournament.matches)
  @JoinColumn({ name: "tournamentId" })
  tournament!: Tournament;

  @ManyToOne(() => User)
  @JoinColumn({ name: "whitePlayerId" })
  whitePlayer!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: "blackPlayerId" })
  blackPlayer!: User;
}