import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import type { Match } from "./Match";
import type { Inscription } from "./Inscription";
import type { User } from "./User";

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
    enum: ["swiss", "round_robin", "elimination"],
    default: "swiss",
    nullable: true
  })
  tournamentFormat?: "swiss" | "round_robin" | "elimination";

  @Column({ nullable: true })
  totalRounds?: number;

  @Column({ 
    type: "enum", 
    enum: ["upcoming", "ongoing", "finished", "cancelled"],
    default: "upcoming"
  })
  status!: "upcoming" | "ongoing" | "finished" | "cancelled";

  // Nuevo campo: quién creó el torneo (opcional para migración)
  @Column({ nullable: true })
  createdBy?: number;

  // Relaciones
  // TODO: Agregar relación con User cuando los datos existentes estén migrados
  // @ManyToOne(() => require("./User").User)
  // @JoinColumn({ name: "createdBy" })
  // creator!: User;
  @OneToMany(() => require("./Match").Match, (match: Match) => match.tournament)
  matches!: Match[];

  @OneToMany(() => require("./Inscription").Inscription, (inscription: Inscription) => inscription.tournament)
  inscriptions!: Inscription[];
}