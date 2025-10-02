import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Tournament } from "../entities/Tournament";

export class TournamentRepository {
  private repository: Repository<Tournament>;

  constructor() {
    this.repository = AppDataSource.getRepository(Tournament);
  }

  async findAll(): Promise<Tournament[]> {
    return await this.repository.find({
      relations: ['matches', 'inscriptions']
    });
  }

  async findById(id: number): Promise<Tournament | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['matches', 'inscriptions']
    });
  }

  async findByStatus(status: "upcoming" | "ongoing" | "finished" | "cancelled"): Promise<Tournament[]> {
    return await this.repository.find({
      where: { status },
      relations: ['inscriptions']
    });
  }

  async create(tournamentData: Partial<Tournament>): Promise<Tournament> {
    const tournament = this.repository.create(tournamentData);
    return await this.repository.save(tournament);
  }

  async update(id: number, tournamentData: Partial<Tournament>): Promise<Tournament | null> {
    await this.repository.update(id, tournamentData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected! > 0;
  }
}