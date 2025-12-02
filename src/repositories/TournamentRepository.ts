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

  /**
   * Verificar las relaciones del torneo antes de eliminar
   */
  async checkTournamentRelations(id: number): Promise<{
    hasInscriptions: boolean;
    hasMatches: boolean;
    inscriptionCount: number;
    matchCount: number;
  }> {
    const inscriptionRepository = AppDataSource.getRepository("Inscription");
    const matchRepository = AppDataSource.getRepository("Match");

    const inscriptionCount = await inscriptionRepository.count({
      where: { tournamentId: id }
    });

    const matchCount = await matchRepository.count({
      where: { tournamentId: id }
    });

    return {
      hasInscriptions: inscriptionCount > 0,
      hasMatches: matchCount > 0,
      inscriptionCount,
      matchCount
    };
  }

  /**
   * Eliminar torneo de forma segura, eliminando primero inscripciones y partidas
   */
  async deleteTournamentSafely(id: number): Promise<boolean> {
    return await AppDataSource.transaction(async manager => {
      // 1. Verificar que el torneo existe
      const tournament = await manager.findOne(Tournament, { where: { id } });
      if (!tournament) {
        throw new Error("Torneo no encontrado");
      }

      // 2. Eliminar todas las partidas del torneo
      const matchRepository = manager.getRepository("Match");
      await matchRepository.delete({ tournamentId: id });

      // 3. Eliminar todas las inscripciones del torneo
      const inscriptionRepository = manager.getRepository("Inscription");
      await inscriptionRepository.delete({ tournamentId: id });

      // 4. Finalmente eliminar el torneo
      const tournamentRepository = manager.getRepository(Tournament);
      const result = await tournamentRepository.delete(id);

      return result.affected! > 0;
    });
  }
}