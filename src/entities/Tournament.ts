import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Match } from "./Match";
import { Inscription } from "./Inscription";

@Entity("tournaments")
export class Tournament {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: "date" })
  startDate!: Date;

  @Column({ type: "date" })
  endDate!: Date;

  @Column()
  location!: string;

  @Column({ 
    type: "enum", 
    enum: ["upcoming", "ongoing", "finished", "cancelled"],
    default: "upcoming"
  })
  status!: "upcoming" | "ongoing" | "finished" | "cancelled";

  // Relaciones
  @OneToMany(() => Match, match => match.tournament)
  matches!: Match[];

  @OneToMany(() => Inscription, inscription => inscription.tournament)
  inscriptions!: Inscription[];
}