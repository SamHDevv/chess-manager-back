import { InscriptionRepository } from "../repositories/InscriptionRepository";
import { UserRepository } from "../repositories/UserRepository";
import { TournamentRepository } from "../repositories/TournamentRepository";
import { Inscription } from "../entities/Inscription";

export class InscriptionService {
  private inscriptionRepository: InscriptionRepository;
  private userRepository: UserRepository;
  private tournamentRepository: TournamentRepository;

  constructor() {
    this.inscriptionRepository = new InscriptionRepository();
    this.userRepository = new UserRepository();
    this.tournamentRepository = new TournamentRepository();
  }

  async getAllInscriptions(): Promise<Inscription[]> {
    return await this.inscriptionRepository.findAll();
  }

  async getInscriptionById(id: number): Promise<Inscription | null> {
    return await this.inscriptionRepository.findById(id);
  }

  async getInscriptionsByUserId(userId: number): Promise<Inscription[]> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    return await this.inscriptionRepository.findByUserId(userId);
  }

  async getInscriptionsByTournamentId(tournamentId: number): Promise<Inscription[]> {
    // Verificar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    return await this.inscriptionRepository.findByTournamentId(tournamentId);
  }

  async createInscription(inscriptionData: {
    userId: number;
    tournamentId: number;
  }): Promise<Inscription> {
    const { userId, tournamentId } = inscriptionData;

    // Validar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Validar que el torneo existe
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // Verificar que el torneo esté en estado "upcoming"
    if (tournament.status !== "upcoming") {
      throw new Error("No se puede inscribir en un torneo que no esté próximo");
    }

    // Verificar que no haya pasado la fecha límite de inscripción
    if (tournament.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)) {
      throw new Error("La fecha límite de inscripción ha pasado");
    }

    // Verificar que el usuario no esté ya inscrito
    const existingInscription = await this.inscriptionRepository.findByUserAndTournament(userId, tournamentId);
    if (existingInscription) {
      throw new Error("El usuario ya está inscrito en este torneo");
    }

    // Verificar que no se haya alcanzado el límite de participantes
    if (tournament.maxParticipants) {
      const currentParticipants = await this.inscriptionRepository.countByTournamentId(tournamentId);
      if (currentParticipants >= tournament.maxParticipants) {
        throw new Error("El torneo ha alcanzado el número máximo de participantes");
      }
    }

    return await this.inscriptionRepository.create({
      userId,
      tournamentId
    });
  }

  async deleteInscription(id: number): Promise<boolean> {
    const existingInscription = await this.inscriptionRepository.findById(id);
    if (!existingInscription) {
      throw new Error("Inscripción no encontrada");
    }

    // Verificar que el torneo esté en estado "upcoming"
    const tournament = await this.tournamentRepository.findById(existingInscription.tournamentId);
    if (tournament && tournament.status !== "upcoming") {
      throw new Error("No se puede cancelar la inscripción de un torneo que ya ha comenzado");
    }

    return await this.inscriptionRepository.delete(id);
  }

  async cancelInscriptionByUserAndTournament(userId: number, tournamentId: number): Promise<boolean> {
    const inscription = await this.inscriptionRepository.findByUserAndTournament(userId, tournamentId);
    if (!inscription) {
      throw new Error("Inscripción no encontrada");
    }

    // Verificar que el torneo existe y obtener sus datos
    const tournament = await this.tournamentRepository.findById(tournamentId);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    // No permitir cancelar si el torneo ya comenzó
    if (tournament.status !== "upcoming") {
      throw new Error("No puedes cancelar tu inscripción en un torneo que ya ha comenzado");
    }

    // Opcional: Verificar fecha límite de cancelación (24h antes del inicio)
    const hoursBeforeStart = 24;
    const cancelDeadline = new Date(tournament.startDate);
    cancelDeadline.setHours(cancelDeadline.getHours() - hoursBeforeStart);
    
    if (new Date() > cancelDeadline) {
      throw new Error(`No puedes cancelar tu inscripción menos de ${hoursBeforeStart} horas antes del inicio del torneo`);
    }

    return await this.inscriptionRepository.delete(inscription.id);
  }
}