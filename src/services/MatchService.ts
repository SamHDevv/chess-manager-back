import { MatchRepository } from "../repositories/MatchRepository";
import { UserRepository } from "../repositories/UserRepository";
import { TournamentRepository } from "../repositories/TournamentRepository";
import { InscriptionRepository } from "../repositories/InscriptionRepository";
import { Match } from "../entities/Match";
import { EloCalculationService } from "./EloCalculationService";
import { UserService } from "./UserService";

export class MatchService {
  private matchRepository: MatchRepository;
  private userRepository: UserRepository;
  private tournamentRepository: TournamentRepository;
  private inscriptionRepository: InscriptionRepository;
  private userService: UserService;

  constructor() {
    this.matchRepository = new MatchRepository();
    this.userRepository = new UserRepository();
    this.tournamentRepository = new TournamentRepository();
    this.inscriptionRepository = new InscriptionRepository();
    this.userService = new UserService();
  }

  async getAllMatches(): Promise<Match[]> {
    return await this.matchRepository.findAll();
  }

  async getMatchById(id: number): Promise<Match | null> {
    return await this.matchRepository.findById(id);
  }

  async getMatchesByTournamentId(tournamentId: number): Promise<Match[]> {
    // Verificar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    return await this.matchRepository.findByTournamentId(tournamentId);
  }

  async getMatchesByRound(tournamentId: number, round: number): Promise<Match[]> {
    // Verificar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    if (round < 1) {
      throw new Error("El número de ronda debe ser mayor a 0");
    }

    return await this.matchRepository.findByRound(tournamentId, round);
  }

  async getMatchesByPlayerId(playerId: number): Promise<Match[]> {
    // Verificar que el jugador existe (incluir usuarios eliminados para mostrar historial)
    const player = await this.userRepository.findByIdIncludingDeleted(playerId);
    if (!player) {
      throw new Error("Jugador no encontrado");
    }

    return await this.matchRepository.findByPlayerId(playerId);
  }

  async getOngoingMatches(): Promise<Match[]> {
    return await this.matchRepository.findOngoingMatches();
  }

  async createMatch(matchData: {
    tournamentId: number;
    whitePlayerId: number;
    blackPlayerId: number;
    round?: number;
  }): Promise<Match> {
    const { tournamentId, whitePlayerId, blackPlayerId, round } = matchData;

    // Validar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // Verificar que el torneo esté en estado "ongoing"
    if (tournament.status !== "ongoing") {
      throw new Error("Solo se pueden crear partidas en torneos en curso");
    }

    // Validar que ambos jugadores existen
    const whitePlayer = await this.userRepository.findById(whitePlayerId);
    if (!whitePlayer) {
      throw new Error("Jugador con piezas blancas no encontrado");
    }

    const blackPlayer = await this.userRepository.findById(blackPlayerId);
    if (!blackPlayer) {
      throw new Error("Jugador con piezas negras no encontrado");
    }

    // Validar que no es el mismo jugador
    if (whitePlayerId === blackPlayerId) {
      throw new Error("Un jugador no puede jugar contra sí mismo");
    }

    // Verificar que ambos jugadores están inscritos en el torneo
    const whiteInscription = await this.inscriptionRepository.findByUserAndTournament(whitePlayerId, tournamentId);
    if (!whiteInscription) {
      throw new Error("El jugador con piezas blancas no está inscrito en este torneo");
    }

    const blackInscription = await this.inscriptionRepository.findByUserAndTournament(blackPlayerId, tournamentId);
    if (!blackInscription) {
      throw new Error("El jugador con piezas negras no está inscrito en este torneo");
    }

    // Determinar la ronda
    let matchRound = round;
    if (!matchRound) {
      const maxRound = await this.matchRepository.getMaxRound(tournamentId);
      matchRound = maxRound + 1;
    }

    return await this.matchRepository.create({
      tournamentId,
      whitePlayerId,
      blackPlayerId,
      round: matchRound,
      result: "not_started"
    });
  }

  async updateMatchResult(id: number, result: "white_wins" | "black_wins" | "draw", userId?: number): Promise<Match | null> {
    const existingMatch = await this.matchRepository.findById(id);
    if (!existingMatch) {
      throw new Error("Partida no encontrada");
    }

    // Verificar permisos de organizador o admin si se proporciona userId
    if (userId) {
      const isAuthorized = await this.isUserTournamentOrganizer(userId, existingMatch.tournamentId);
      if (!isAuthorized) {
        throw new Error("Solo el organizador del torneo o un administrador puede actualizar los resultados");
      }
    }

    // Verificar que la partida no esté ya finalizada
    if (existingMatch.result !== "not_started" && existingMatch.result !== "ongoing") {
      throw new Error("La partida ya tiene un resultado final");
    }

    // Actualizar resultado de la partida
    const updatedMatch = await this.matchRepository.update(id, { result });

    // 📊 Actualizar ELO de ambos jugadores (el resultado ya es final: white_wins, black_wins o draw)
    try {
      const whitePlayer = await this.userRepository.findById(existingMatch.whitePlayerId);
      const blackPlayer = await this.userRepository.findById(existingMatch.blackPlayerId);
      
      if (whitePlayer && blackPlayer) {
        // Calcular nuevos ELOs usando el sistema FIDE con K-factor dinámico
        const eloResult = EloCalculationService.calculateNewElosWithDynamicK(
          whitePlayer.elo,
          blackPlayer.elo,
          result
        );
        
        // Actualizar ELO de ambos jugadores
        await this.userService.updateUserElo(
          whitePlayer.id, 
          eloResult.player1NewElo, 
          `Partida #${id} (${eloResult.player1Change >= 0 ? '+' : ''}${eloResult.player1Change})`
        );
        
        await this.userService.updateUserElo(
          blackPlayer.id, 
          eloResult.player2NewElo, 
          `Partida #${id} (${eloResult.player2Change >= 0 ? '+' : ''}${eloResult.player2Change})`
        );

        console.log(`✅ ELO actualizado por partida #${id}:`);
        console.log(`   🔷 ${whitePlayer.name}: ${whitePlayer.elo} → ${eloResult.player1NewElo} (${eloResult.player1Change >= 0 ? '+' : ''}${eloResult.player1Change})`);
        console.log(`   🔶 ${blackPlayer.name}: ${blackPlayer.elo} → ${eloResult.player2NewElo} (${eloResult.player2Change >= 0 ? '+' : ''}${eloResult.player2Change})`);
      }
    } catch (eloError) {
      // Log el error pero no fallar la actualización del resultado
      console.error(`⚠️ Error al actualizar ELO para partida #${id}:`, eloError);
    }

    return updatedMatch;
  }

  async startMatch(id: number): Promise<Match | null> {
    const existingMatch = await this.matchRepository.findById(id);
    if (!existingMatch) {
      throw new Error("Partida no encontrada");
    }

    if (existingMatch.result !== "not_started") {
      throw new Error("La partida ya ha sido iniciada");
    }

    return await this.matchRepository.update(id, { result: "ongoing" });
  }

  async deleteMatch(id: number): Promise<boolean> {
    const existingMatch = await this.matchRepository.findById(id);
    if (!existingMatch) {
      throw new Error("Partida no encontrada");
    }

    // Solo permitir eliminar partidas que no han comenzado
    if (existingMatch.result !== "not_started") {
      throw new Error("Solo se pueden eliminar partidas que no han comenzado");
    }

    return await this.matchRepository.delete(id);
  }

  async generateRoundPairings(tournamentId: number): Promise<Match[]> {
    // Verificar que el torneo existe y está en curso
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    if (tournament.status !== "ongoing") {
      throw new Error("Solo se pueden generar emparejamientos en torneos en curso");
    }

    // Obtener todos los jugadores inscritos
    const inscriptions = await this.inscriptionRepository.findByTournamentId(tournamentId);
    if (inscriptions.length < 2) {
      throw new Error("Se necesitan al menos 2 jugadores para generar emparejamientos");
    }

    if (inscriptions.length % 2 !== 0) {
      throw new Error("El número de jugadores debe ser par para generar emparejamientos");
    }

    // Determinar la siguiente ronda
    const maxRound = await this.matchRepository.getMaxRound(tournamentId);
    const nextRound = maxRound + 1;

    // Crear emparejamientos simples (esto se puede mejorar con algoritmos más sofisticados)
    const matches: Match[] = [];
    const players = inscriptions.map(i => i.userId);
    
    for (let i = 0; i < players.length; i += 2) {
      const whitePlayerId = players[i];
      const blackPlayerId = players[i + 1];

      const match = await this.matchRepository.create({
        tournamentId,
        whitePlayerId,
        blackPlayerId,
        round: nextRound,
        result: "not_started"
      });

      matches.push(match);
    }

    return matches;
  }

  async getTournamentStandings(tournamentId: number): Promise<any[]> {
    // Verificar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // Obtener todas las partidas del torneo
    const matches = await this.matchRepository.findByTournamentId(tournamentId);
    
    // Obtener todos los jugadores inscritos
    const inscriptions = await this.inscriptionRepository.findByTournamentId(tournamentId);
    
    // Calcular puntuaciones
    const standings = inscriptions.map(inscription => {
      const playerId = inscription.userId;
      let points = 0;
      let gamesPlayed = 0;

      matches.forEach(match => {
        if (match.whitePlayerId === playerId || match.blackPlayerId === playerId) {
          if (match.result !== 'not_started' && match.result !== 'ongoing') {
            gamesPlayed++;
            
            if (match.result === 'draw') {
              points += 0.5;
            } else if (
              (match.whitePlayerId === playerId && match.result === 'white_wins') ||
              (match.blackPlayerId === playerId && match.result === 'black_wins')
            ) {
              points += 1;
            }
          }
        }
      });

      return {
        playerId,
        playerName: inscription.user?.name || 'Jugador desconocido',
        playerElo: inscription.user?.elo || 1500,
        points,
        gamesPlayed,
        wins: matches.filter(m => 
          (m.whitePlayerId === playerId && m.result === 'white_wins') ||
          (m.blackPlayerId === playerId && m.result === 'black_wins')
        ).length,
        draws: matches.filter(m => 
          (m.whitePlayerId === playerId || m.blackPlayerId === playerId) && 
          m.result === 'draw'
        ).length,
        losses: gamesPlayed - matches.filter(m => 
          ((m.whitePlayerId === playerId && m.result === 'white_wins') ||
          (m.blackPlayerId === playerId && m.result === 'black_wins') ||
          ((m.whitePlayerId === playerId || m.blackPlayerId === playerId) && m.result === 'draw'))
        ).length
      };
    });

    // Ordenar por puntos (descendente)
    return standings.sort((a, b) => b.points - a.points);
  }

  /**
   * Verificar si el usuario es organizador del torneo
   */
  async isUserTournamentOrganizer(userId: number, tournamentId: number): Promise<boolean> {
    const tournament = await this.tournamentRepository.findById(tournamentId);
    
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // Verificar si es el organizador del torneo
    if (tournament.createdBy === userId) {
      return true;
    }

    // Verificar si el usuario es admin
    const user = await this.userRepository.findById(userId);
    if (user && user.role === 'admin') {
      return true;
    }

    return false;
  }
}