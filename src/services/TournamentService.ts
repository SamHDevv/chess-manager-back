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
    description?: string;
    maxParticipants?: number;
    registrationDeadline?: Date;
    tournamentFormat?: "swiss" | "round_robin" | "elimination";
    totalRounds?: number;
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
      status: tournamentData.status || "upcoming",
      tournamentFormat: tournamentData.tournamentFormat || "swiss"
    });
  }

  async updateTournament(id: number, tournamentData: Partial<Tournament>): Promise<Tournament | null> {
    const existingTournament = await this.tournamentRepository.findById(id);
    if (!existingTournament) {
      throw new Error("Torneo no encontrado");
    }

    // RESTRICCIONES POR ESTADO DEL TORNEO
    if (existingTournament.status === "finished" || existingTournament.status === "cancelled") {
      throw new Error("No se puede modificar un torneo finalizado o cancelado.");
    }

    if (existingTournament.status === "ongoing") {
      // permitir modificar descripción y extender fecha de fin
      const allowedFields = ["description", "endDate"];
      const attemptedFields = Object.keys(tournamentData);
      const invalidFields = attemptedFields.filter(field => !allowedFields.includes(field));
      
      if (invalidFields.length > 0) {
        throw new Error(`No se pueden modificar los siguientes campos en un torneo en curso: ${invalidFields.join(", ")}. Solo puedes editar la descripción y extender la fecha de fin.`);
      }

      // Si se intenta modificar endDate, solo permitir extenderla
      if (tournamentData.endDate) {
        const newEndDate = new Date(tournamentData.endDate);
        const currentEndDate = new Date(existingTournament.endDate);
        if (newEndDate < currentEndDate) {
          throw new Error("Solo puedes extender la fecha de fin de un torneo en curso, no acortarla.");
        }
      }
    }

    if (existingTournament.status === "upcoming") {
      // Torneo próximo: verificar restricciones si hay participantes
      const inscriptionCount = await this.inscriptionRepository.countByTournamentId(id);
      
      if (inscriptionCount > 0) {
        // No permitir cambiar formato si ya hay participantes
        if (tournamentData.tournamentFormat && tournamentData.tournamentFormat !== existingTournament.tournamentFormat) {
          throw new Error("No puedes cambiar el formato del torneo porque ya hay participantes inscritos. Esto afectaría los emparejamientos.");
        }

        // No permitir reducir maxParticipants por debajo del número actual de inscritos
        if (tournamentData.maxParticipants && tournamentData.maxParticipants < inscriptionCount) {
          throw new Error(`No puedes reducir el máximo de participantes a ${tournamentData.maxParticipants} porque ya hay ${inscriptionCount} participantes inscritos.`);
        }
      }
    }

    // Validar fechas si se proporcionan
    const startDate = tournamentData.startDate ? new Date(tournamentData.startDate) : new Date(existingTournament.startDate);
    const endDate = tournamentData.endDate ? new Date(tournamentData.endDate) : new Date(existingTournament.endDate);
    const registrationDeadline = tournamentData.registrationDeadline 
      ? new Date(tournamentData.registrationDeadline) 
      : (existingTournament.registrationDeadline ? new Date(existingTournament.registrationDeadline) : undefined);

    if (startDate >= endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    if (registrationDeadline && registrationDeadline >= startDate) {
      throw new Error("La fecha límite de inscripción debe ser anterior a la fecha de inicio");
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
   * Calcula el número de rondas según el formato del torneo
   */
  private calculateTotalRounds(format: string, participantCount: number): number {
    switch (format) {
      case "swiss":
        // Sistema Suizo: log₂(n) redondeado hacia arriba
        return Math.ceil(Math.log2(participantCount));
      case "round_robin":
        // Todos contra todos: n - 1 rondas
        return participantCount - 1;
      case "elimination":
        // Eliminación directa: log₂(n)
        return Math.ceil(Math.log2(participantCount));
      default:
        // Por defecto usar sistema suizo
        return Math.ceil(Math.log2(participantCount));
    }
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

    // Calcular o actualizar totalRounds si no está definido
    if (!tournament.totalRounds) {
      const format = tournament.tournamentFormat || "swiss";
      tournament.totalRounds = this.calculateTotalRounds(format, inscriptions.length);
      await this.tournamentRepository.update(tournamentId, { totalRounds: tournament.totalRounds });
      console.log(`📊 Total de rondas calculado para el torneo: ${tournament.totalRounds}`);
    }
    
    // Obtener partidas existentes para determinar la ronda
    const existingMatches = await this.matchRepository.findByTournamentId(tournamentId);
    const currentRound = existingMatches.length > 0 
      ? Math.max(...existingMatches.map(m => m.round)) + 1 
      : 1;

    // Verificar que no se exceda el número total de rondas
    if (currentRound > tournament.totalRounds) {
      throw new Error(`No se pueden generar más rondas. El torneo está configurado para ${tournament.totalRounds} ronda(s) y ya se han completado todas.`);
    }
    
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

  /**
   * Inicia un torneo manualmente (de "Próximo" a "En curso")
   * Requiere que haya al menos 2 participantes inscritos
   */
  async startTournament(tournamentId: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findByIdSimple(tournamentId);
    
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    if (tournament.status !== "upcoming") {
      throw new Error(`No se puede iniciar un torneo con estado "${tournament.status}". Debe estar en estado "Próximo"`);
    }

    // Verificar que haya participantes inscritos
    const inscriptions = await this.inscriptionRepository.findByTournamentId(tournamentId);
    
    if (inscriptions.length < 4) {
      throw new Error("Se requieren al menos 4 participantes inscritos para iniciar el torneo");
    }

    // Cambiar estado a "En curso"
    const updatedTournament = await this.tournamentRepository.update(tournamentId, { status: "ongoing" });
    
    if (!updatedTournament) {
      throw new Error("Error al actualizar el estado del torneo");
    }

    console.log(`🏁 Torneo iniciado manualmente: "${tournament.name}" (ID: ${tournamentId})`);
    return updatedTournament;
  }

  /**
   * Finaliza un torneo manualmente (de "En curso" a "Finalizado")
   */
  async finishTournament(tournamentId: number): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findByIdSimple(tournamentId);
    
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    if (tournament.status !== "ongoing") {
      throw new Error(`No se puede finalizar un torneo con estado "${tournament.status}". Debe estar "En curso"`);
    }

    // Cambiar estado a "Finalizado"
    const updatedTournament = await this.tournamentRepository.update(tournamentId, { status: "finished" });
    
    if (!updatedTournament) {
      throw new Error("Error al actualizar el estado del torneo");
    }

    console.log(`🏆 Torneo finalizado manualmente: "${tournament.name}" (ID: ${tournamentId})`);
    return updatedTournament;
  }
}
