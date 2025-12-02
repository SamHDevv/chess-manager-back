import { TournamentRepository } from "../repositories/TournamentRepository";
import { Tournament } from "../entities/Tournament";

/**
 * Servicio para gestionar transiciones automáticas de estado de torneos
 * basadas en fechas de inicio y fin
 */
export class TournamentSchedulerService {
  private tournamentRepository: TournamentRepository;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
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

      // 2. Buscar torneos "En curso" cuya fecha de fin ya pasó
      const ongoingTournaments = await this.tournamentRepository.findByStatus("ongoing");
      
      for (const tournament of ongoingTournaments) {
        if (tournament.endDate <= now) {
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
   * Inicia un torneo (de "Próximo" a "En curso")
   */
  private async startTournament(tournament: Tournament): Promise<void> {
    tournament.status = "ongoing";
    await this.tournamentRepository.update(tournament.id, tournament);
    console.log(`🏁 [Scheduler] Torneo iniciado: "${tournament.name}" (ID: ${tournament.id})`);
  }

  /**
   * Finaliza un torneo (de "En curso" a "Finalizado")
   */
  private async finishTournament(tournament: Tournament): Promise<void> {
    tournament.status = "finished";
    await this.tournamentRepository.update(tournament.id, tournament);
    console.log(`🏆 [Scheduler] Torneo finalizado: "${tournament.name}" (ID: ${tournament.id})`);
  }
}
