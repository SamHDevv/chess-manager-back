import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { Match } from "../entities/Match";

export class MatchRepository {
  private repository: Repository<Match>;

  constructor() {
    this.repository = AppDataSource.getRepository(Match);
  }

  async findAll(): Promise<Match[]> {
    return await this.repository.find({
      relations: ['tournament', 'whitePlayer', 'blackPlayer'],
      order: { round: 'ASC', id: 'ASC' }
    });
  }

  async findById(id: number): Promise<Match | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['tournament', 'whitePlayer', 'blackPlayer']
    });
  }

  async findByTournamentId(tournamentId: number): Promise<Match[]> {
    return await this.repository.find({
      where: { tournamentId },
      relations: ['whitePlayer', 'blackPlayer'],
      order: { round: 'ASC', id: 'ASC' }
    });
  }

  async findByRound(tournamentId: number, round: number): Promise<Match[]> {
    return await this.repository.find({
      where: { tournamentId, round },
      relations: ['whitePlayer', 'blackPlayer'],
      order: { id: 'ASC' }
    });
  }

  async findByPlayerId(playerId: number): Promise<Match[]> {
    return await this.repository.find({
      where: [
        { whitePlayerId: playerId },
        { blackPlayerId: playerId }
      ],
      relations: ['tournament', 'whitePlayer', 'blackPlayer'],
      order: { round: 'ASC', id: 'ASC' }
    });
  }

  async findByPlayerAndTournament(playerId: number, tournamentId: number): Promise<Match[]> {
    return await this.repository.find({
      where: [
        { whitePlayerId: playerId, tournamentId },
        { blackPlayerId: playerId, tournamentId }
      ],
      relations: ['tournament', 'whitePlayer', 'blackPlayer'],
      order: { round: 'ASC', id: 'ASC' }
    });
  }

  async findOngoingMatches(): Promise<Match[]> {
    return await this.repository.find({
      where: { result: 'ongoing' },
      relations: ['tournament', 'whitePlayer', 'blackPlayer'],
      order: { round: 'ASC', id: 'ASC' }
    });
  }

  async create(matchData: Partial<Match>): Promise<Match> {
    const match = this.repository.create(matchData);
    return await this.repository.save(match);
  }

  async update(id: number, matchData: Partial<Match>): Promise<Match | null> {
    await this.repository.update(id, matchData);
    return await this.findById(id);
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

  async countByResult(tournamentId: number, result: "white_wins" | "black_wins" | "draw" | "ongoing" | "not_started"): Promise<number> {
    return await this.repository.count({
      where: { tournamentId, result }
    });
  }

  async getMaxRound(tournamentId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("match")
      .select("MAX(match.round)", "maxRound")
      .where("match.tournamentId = :tournamentId", { tournamentId })
      .getRawOne();
    
    return result?.maxRound || 0;
  }
}