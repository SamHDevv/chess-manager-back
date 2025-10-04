import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Inscription } from "../entities/Inscription";

export class InscriptionRepository {
  private repository: Repository<Inscription>;

  constructor() {
    this.repository = AppDataSource.getRepository(Inscription);
  }

  async findAll(): Promise<Inscription[]> {
    return await this.repository.find({
      relations: ['user', 'tournament']
    });
  }

  async findById(id: number): Promise<Inscription | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'tournament']
    });
  }

  async findByUserId(userId: number): Promise<Inscription[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['tournament'],
      order: { registrationDate: 'DESC' }
    });
  }

  async findByTournamentId(tournamentId: number): Promise<Inscription[]> {
    return await this.repository.find({
      where: { tournamentId },
      relations: ['user'],
      order: { registrationDate: 'ASC' }
    });
  }

  async findByUserAndTournament(userId: number, tournamentId: number): Promise<Inscription | null> {
    return await this.repository.findOne({
      where: { userId, tournamentId },
      relations: ['user', 'tournament']
    });
  }

  async create(inscriptionData: Partial<Inscription>): Promise<Inscription> {
    const inscription = this.repository.create(inscriptionData);
    return await this.repository.save(inscription);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected! > 0;
  }

  async countByTournamentId(tournamentId: number): Promise<number> {
    return await this.repository.count({
      where: { tournamentId }
    });
  }
}