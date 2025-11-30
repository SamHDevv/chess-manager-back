import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { User } from "../entities/User";

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<User[]> {
    return await this.repository.find({
      relations: ['inscriptions']
    });
  }

  async findById(id: number): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['inscriptions']
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email }
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return await this.repository.save(user);
  }

  async update(id: number, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected! > 0;
  }

  /**
   * Verificar las relaciones críticas del usuario antes de eliminar
   */
  async checkUserRelations(id: number): Promise<{
    hasMatches: boolean;
    hasCreatedTournaments: boolean;
    hasInscriptions: boolean;
  }> {
    // Verificar si el usuario tiene partidas (como jugador blanco o negro)
    const matchRepository = AppDataSource.getRepository("Match");
    const matchCount = await matchRepository.count({
      where: [
        { whitePlayerId: id },
        { blackPlayerId: id }
      ]
    });

    // Verificar si el usuario ha creado torneos
    const tournamentRepository = AppDataSource.getRepository("Tournament");
    const tournamentCount = await tournamentRepository.count({
      where: { createdBy: id }
    });

    // Verificar inscripciones (estas se pueden eliminar automáticamente)
    const inscriptionRepository = AppDataSource.getRepository("Inscription");
    const inscriptionCount = await inscriptionRepository.count({
      where: { userId: id }
    });

    return {
      hasMatches: matchCount > 0,
      hasCreatedTournaments: tournamentCount > 0,
      hasInscriptions: inscriptionCount > 0
    };
  }

  /**
   * Eliminar usuario eliminando primero las inscripciones
   */
  async deleteWithRelations(id: number): Promise<boolean> {
    // Usar transacción para garantizar consistencia
    return await AppDataSource.transaction(async manager => {
      // 1. Eliminar inscripciones del usuario
      const inscriptionRepository = manager.getRepository("Inscription");
      await inscriptionRepository.delete({ userId: id });

      // 2. Eliminar el usuario
      const userRepository = manager.getRepository(User);
      const result = await userRepository.delete(id);
      
      return result.affected! > 0;
    });
  }

  /**
   * Eliminación segura con manejo automático de todas las relaciones
   */
  async deleteUserSafely(id: number): Promise<boolean> {
    return await AppDataSource.transaction(async manager => {
      // 1. Eliminar inscripciones automáticamente
      const inscriptionRepository = manager.getRepository("Inscription");
      await inscriptionRepository.delete({ userId: id });

      // 2. Transferir torneos creados a un admin (o marcarlos como huérfanos)
      const tournamentRepository = manager.getRepository("Tournament");
      
      // Buscar un admin disponible
      const adminUser = await manager.getRepository(User)
        .findOne({ where: { role: "admin" } });
      
      if (adminUser) {
        await tournamentRepository.update(
          { createdBy: id }, 
          { createdBy: adminUser.id }
        );
      } else {
        // Si no hay admin disponible, marcar como sistema
        await tournamentRepository.update(
          { createdBy: id }, 
          { createdBy: null }
        );
      }

      // 3. Conservar partidas pero crear usuario anónimo si no existe
      const matchRepository = manager.getRepository("Match");
      
      // Verificar si existe usuario anónimo, si no, crearlo
      let anonymousUser = await manager.getRepository(User)
        .findOne({ where: { email: "anonymous@sistema.com" } });
      
      if (!anonymousUser) {
        anonymousUser = await manager.getRepository(User).save({
          name: "Usuario Eliminado",
          email: "anonymous@sistema.com",
          password: "no-login",
          role: "player"
        });
      }
      
      // Transferir partidas al usuario anónimo
      await matchRepository.update(
        { whitePlayerId: id }, 
        { whitePlayerId: anonymousUser.id }
      );
      
      await matchRepository.update(
        { blackPlayerId: id }, 
        { blackPlayerId: anonymousUser.id }
      );

      // 4. Finalmente eliminar el usuario
      const userRepository = manager.getRepository(User);
      const result = await userRepository.delete(id);
      
      return result.affected! > 0;
    });
  }
}