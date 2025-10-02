import { TournamentRepository } from "../repositories/TournamentRepository";
import { Tournament } from "../entities/Tournament";

export class TournamentService {
  private tournamentRepository: TournamentRepository;

  constructor() {
    this.tournamentRepository = new TournamentRepository();
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

    // Regla de negocio: No eliminar torneos que ya empezaron
    if (existingTournament.status === "ongoing") {
      throw new Error("No se puede eliminar un torneo en curso");
    }

    return await this.tournamentRepository.delete(id);
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
}