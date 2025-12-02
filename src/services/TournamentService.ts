import { TournamentRepository } from "../repositories/TournamentRepository";
import { InscriptionRepository } from "../repositories/InscriptionRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { Tournament } from "../entities/Tournament";
import { Match } from "../entities/Match";

export class TournamentService {
  private tournamentRepository: TournamentRepository;
  private inscriptionRepository: InscriptionRepository;
  private matchRepository: MatchRepository;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
    this.inscriptionRepository = new InscriptionRepository();
    this.matchRepository = new MatchRepository();
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await this.tournamentRepository.findAll();
  }

  async getTournamentById(id: number): Promise<Tournament | null> {
    return await this.tournamentRepository.findById(id);
  }

  async getUpcomingTournaments(): Promise<Tournament[]> {
    return await this.tournamentRepository.findByStatus("upcoming");
  }

  async createTournament(tournamentData: {
    name: string;
    startDate: Date;
    endDate: Date;
    location: string;
    status?: "upcoming" | "ongoing" | "finished" | "cancelled";
  }): Promise<Tournament> {
    // Validaciones de campos obligatorios
    if (!tournamentData.name || !tournamentData.startDate || !tournamentData.endDate || !tournamentData.location) {
      throw new Error("El nombre, fecha de inicio, fecha de fin y ubicación son obligatorios");
    }

    // Validar que la fecha de inicio sea anterior a la de fin
    if (new Date(tournamentData.startDate) >= new Date(tournamentData.endDate)) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    // Validar que las fechas no sean pasadas (para torneos nuevos)
    if (new Date(tournamentData.startDate) < new Date()) {
      throw new Error("La fecha de inicio no puede ser en el pasado");
    }

    return await this.tournamentRepository.create({
      ...tournamentData,
      status: tournamentData.status || "upcoming"
    });
  }

  async updateTournament(id: number, tournamentData: Partial<Tournament>): Promise<Tournament | null> {
    const existingTournament = await this.tournamentRepository.findById(id);
    if (!existingTournament) {
      throw new Error("Torneo no encontrado");
    }

    // Validaciones si se actualizan fechas
    if (tournamentData.startDate && tournamentData.endDate) {
      if (new Date(tournamentData.startDate) >= new Date(tournamentData.endDate)) {
        throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
      }
    }

    return await this.tournamentRepository.update(id, tournamentData);
  }

  async deleteTournament(id: number): Promise<boolean> {
    const existingTournament = await this.tournamentRepository.findById(id);
    if (!existingTournament) {
      throw new Error("Torneo no encontrado");
    }

    // Regla de negocio: No eliminar torneos que ya empezaron o terminaron
    if (existingTournament.status === "ongoing") {
      throw new Error("No se puede eliminar un torneo en curso. Cancélalo primero.");
    }

    if (existingTournament.status === "finished") {
      throw new Error("No se puede eliminar un torneo finalizado. Los datos históricos deben preservarse.");
    }

    // Usar eliminación segura que maneja inscripciones y partidas automáticamente
    return await this.tournamentRepository.deleteTournamentSafely(id);
  }

  async getTournamentDeletionInfo(id: number): Promise<{
    canDelete: boolean;
    reason?: string;
    relations: {
      hasInscriptions: boolean;
      hasMatches: boolean;
      inscriptionCount: number;
      matchCount: number;
    };
  }> {
    const tournament = await this.tournamentRepository.findById(id);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    const relations = await this.tournamentRepository.checkTournamentRelations(id);

    // Verificar si se puede eliminar
    let canDelete = true;
    let reason: string | undefined;

    if (tournament.status === "ongoing") {
      canDelete = false;
      reason = "No se puede eliminar un torneo en curso. Cancélalo primero.";
    } else if (tournament.status === "finished") {
      canDelete = false;
      reason = "No se puede eliminar un torneo finalizado. Los datos históricos deben preservarse.";
    }

    return {
      canDelete,
      reason,
      relations
    };
  }

  async updateTournamentStatus(
    id: number, 
    status: "upcoming" | "ongoing" | "finished" | "cancelled"
  ): Promise<Tournament | null> {
    const existingTournament = await this.tournamentRepository.findById(id);
    if (!existingTournament) {
      throw new Error("Torneo no encontrado");
    }

    return await this.tournamentRepository.update(id, { status });
  }
  /**
   * Genera partidas para la siguiente ronda usando el sistema Suizo
   */
  async generateMatches(tournamentId: number): Promise<Match[]> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // Verificar que el torneo esté en progreso
    if (tournament.status !== "ongoing") {
      throw new Error("Solo se pueden generar partidas para torneos en progreso");
    }
    
    // Obtener inscripciones del torneo
    const inscriptions = await this.inscriptionRepository.findByTournamentId(tournamentId);
    
    if (inscriptions.length < 2) {
      throw new Error("Se necesitan al menos 2 participantes para generar partidas");
    }
    
    // Obtener partidas existentes para determinar la ronda
    const existingMatches = await this.matchRepository.findByTournamentId(tournamentId);
    const currentRound = existingMatches.length > 0 
      ? Math.max(...existingMatches.map(m => m.round)) + 1 
      : 1;
    
    // Verificar que no haya partidas pendientes en la ronda actual
    const pendingMatches = existingMatches.filter(
      m => m.round === currentRound - 1 && 
      (m.result === "not_started" || m.result === "ongoing")
    );
    
    if (pendingMatches.length > 0 && currentRound > 1) {
      throw new Error("Hay partidas pendientes en la ronda anterior. Completa todos los resultados antes de generar una nueva ronda.");
    }

    // Ordenar jugadores por puntos (sistema suizo)
    const players = inscriptions.map(i => ({
      userId: i.userId,
      points: this.calculatePoints(i.userId, existingMatches),
      opponents: this.getOpponents(i.userId, existingMatches)
    })).sort((a, b) => b.points - a.points);
    
    // Emparejar jugadores evitando repeticiones
    const matches: Match[] = [];
    const paired = new Set<number>();
    
    for (let i = 0; i < players.length; i++) {
      if (paired.has(players[i].userId)) continue;
      
      // Buscar oponente que no haya enfrentado antes
      let paired_found = false;
      for (let j = i + 1; j < players.length; j++) {
        if (paired.has(players[j].userId)) continue;
        
        if (!players[i].opponents.includes(players[j].userId)) {
          const match = await this.matchRepository.create({
            tournamentId,
            whitePlayerId: players[i].userId,
            blackPlayerId: players[j].userId,
            round: currentRound,
            result: "not_started"
          });
          
          matches.push(match);
          paired.add(players[i].userId);
          paired.add(players[j].userId);
          paired_found = true;
          break;
        }
      }

      // Si no encontró pareja que no haya enfrentado, emparejar con el siguiente disponible
      if (!paired_found && !paired.has(players[i].userId)) {
        for (let j = i + 1; j < players.length; j++) {
          if (paired.has(players[j].userId)) continue;
          
          const match = await this.matchRepository.create({
            tournamentId,
            whitePlayerId: players[i].userId,
            blackPlayerId: players[j].userId,
            round: currentRound,
            result: "not_started"
          });
          
          matches.push(match);
          paired.add(players[i].userId);
          paired.add(players[j].userId);
          break;
        }
      }
    }
    
    return matches;
  }

  /**
   * Calcula los puntos de un jugador basado en sus resultados
   * Victoria = 1 punto, Empate = 0.5 puntos, Derrota = 0 puntos
   */
  private calculatePoints(userId: number, matches: Match[]): number {
    let points = 0;
    
    for (const match of matches) {
      // Solo contar partidas finalizadas
      if (match.result === "not_started" || match.result === "ongoing") {
        continue;
      }

      if (match.whitePlayerId === userId) {
        if (match.result === "white_wins") points += 1;
        else if (match.result === "draw") points += 0.5;
      } else if (match.blackPlayerId === userId) {
        if (match.result === "black_wins") points += 1;
        else if (match.result === "draw") points += 0.5;
      }
    }
    
    return points;
  }

  /**
   * Obtiene la lista de oponentes que un jugador ya ha enfrentado
   */
  private getOpponents(userId: number, matches: Match[]): number[] {
    const opponents: number[] = [];
    
    for (const match of matches) {
      if (match.whitePlayerId === userId) {
        opponents.push(match.blackPlayerId);
      } else if (match.blackPlayerId === userId) {
        opponents.push(match.whitePlayerId);
      }
    }
    
    return opponents;
  }
}
