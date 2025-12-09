import { TournamentRepository } from "../repositories/TournamentRepository";
import { MatchRepository } from "../repositories/MatchRepository";
import { Tournament } from "../entities/Tournament";

/**
 * Servicio para gestionar transiciones automáticas de estado de torneos
 * basadas en fechas de inicio y fin
 */
export class TournamentSchedulerService {
  private tournamentRepository: TournamentRepository;
  private matchRepository: MatchRepository;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
    this.matchRepository = new MatchRepository();
  }

  /**
   * Inicia el scheduler que revisa estados cada hora
   */
  start(): void {
    if (this.intervalId) {
      console.log("⏰ Scheduler ya está en ejecución");
      return;
    }

    console.log("🚀 Iniciando Tournament Scheduler...");
    
    // Ejecutar inmediatamente al iniciar
    this.checkTournamentStates();
    
    // Ejecutar cada hora (3600000 ms)
    this.intervalId = setInterval(() => {
      this.checkTournamentStates();
    }, 3600000);

    console.log("✅ Tournament Scheduler iniciado (revisa cada hora)");
  }

  /**
   * Detiene el scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("🛑 Tournament Scheduler detenido");
    }
  }

  /**
   * Revisa y actualiza los estados de todos los torneos según sus fechas
   */
  async checkTournamentStates(): Promise<void> {
    try {
      console.log("⏰ [Scheduler] Revisando estados de torneos...");
      
      const now = new Date();
      let upcomingStarted = 0;
      let ongoingFinished = 0;

      // 1. Buscar torneos "Próximo" cuya fecha de inicio ya pasó
      const upcomingTournaments = await this.tournamentRepository.findByStatus("upcoming");
      
      for (const tournament of upcomingTournaments) {
        if (tournament.startDate <= now) {
          await this.startTournament(tournament);
          upcomingStarted++;
        }
      }

      // 2. Buscar torneos "En curso" que deban finalizarse
      // - Por fecha de fin alcanzada
      // - O por todas las partidas completadas (independiente de la fecha)
      const ongoingTournaments = await this.tournamentRepository.findByStatus("ongoing");
      
      for (const tournament of ongoingTournaments) {
        const shouldFinish = await this.shouldFinishTournament(tournament, now);
        if (shouldFinish) {
          await this.finishTournament(tournament);
          ongoingFinished++;
        }
      }

      if (upcomingStarted > 0 || ongoingFinished > 0) {
        console.log(`✅ [Scheduler] Torneos actualizados: ${upcomingStarted} iniciados, ${ongoingFinished} finalizados`);
      } else {
        console.log("ℹ️  [Scheduler] No hay torneos para actualizar");
      }
    } catch (error) {
      console.error("❌ [Scheduler] Error al revisar estados:", error);
    }
  }

  /**
   * Determina si un torneo debe finalizarse
   * - Si la fecha de fin ya pasó Y todas las partidas están completas
   * - O si todas las partidas están completas Y se han jugado todas las rondas
   */
  private async shouldFinishTournament(tournament: Tournament, now: Date): Promise<boolean> {
    // Obtener todas las partidas del torneo
    const matches = await this.matchRepository.findByTournamentId(tournament.id);
    
    // Si no hay partidas, no finalizar
    if (matches.length === 0) {
      return false;
    }

    // Verificar si todas las partidas están completas
    const allMatchesCompleted = matches.every(
      (match) => match.result && match.result !== "not_started" && match.result !== "ongoing"
    );

    if (!allMatchesCompleted) {
      return false;
    }

    // Si el torneo tiene rondas configuradas, verificar que se hayan jugado todas
    if (tournament.totalRounds) {
      const maxRoundPlayed = Math.max(...matches.map(m => m.round));
      
      if (maxRoundPlayed < tournament.totalRounds) {
        // Aún quedan rondas por jugar, NO finalizar
        console.log(`ℹ️  [Scheduler] Torneo "${tournament.name}" (ID: ${tournament.id}) - Ronda ${maxRoundPlayed}/${tournament.totalRounds} completada. Esperando siguiente ronda.`);
        return false;
      }
    }

    // Todas las partidas completas Y todas las rondas jugadas (o sin rondas configuradas)
    return true;
  }

  /**
   * Inicia un torneo (de "Próximo" a "En curso")
   */
  private async startTournament(tournament: Tournament): Promise<void> {
    await this.tournamentRepository.update(tournament.id, { status: "ongoing" });
    console.log(`🏁 [Scheduler] Torneo iniciado: "${tournament.name}" (ID: ${tournament.id})`);
  }

  /**
   * Finaliza un torneo (de "En curso" a "Finalizado")
   */
  private async finishTournament(tournament: Tournament): Promise<void> {
    await this.tournamentRepository.update(tournament.id, { status: "finished" });
    console.log(`🏆 [Scheduler] Torneo finalizado: "${tournament.name}" (ID: ${tournament.id})`);
  }
}
