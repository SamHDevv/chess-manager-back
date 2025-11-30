import { Repository } from "typeorm";
import { AppDataSource } from "../database/data-source";
import { User } from "../entities/User";

// ID especial para usuarios eliminados (fuera del rango normal de auto-increment)
const DELETED_USER_ID = 999999;

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<User[]> {
    // Por defecto, solo usuarios activos
    return await this.repository.find({
      where: { isDeleted: false },
      relations: ['inscriptions']
    });
  }

  async findById(id: number): Promise<User | null> {
    // Por defecto, solo usuarios activos
    return await this.repository.findOne({
      where: { id, isDeleted: false },
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
   * Eliminación segura con soft delete híbrido (NUEVO ENFOQUE)
   */
  async deleteUserSafely(id: number): Promise<boolean> {
    return await AppDataSource.transaction(async manager => {
      const userRepository = manager.getRepository(User);
      
      // Obtener el usuario actual
      const user = await userRepository.findOne({ where: { id } });
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      // 1. Eliminar inscripciones automáticamente (siguen siendo eliminadas)
      const inscriptionRepository = manager.getRepository("Inscription");
      await inscriptionRepository.delete({ userId: id });

      // 2. Transferir torneos creados a un admin (igual que antes)
      const tournamentRepository = manager.getRepository("Tournament");
      
      // Buscar un admin disponible
      const adminUser = await userRepository
        .findOne({ where: { role: "admin", isDeleted: false } });
      
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

      // 3. SOFT DELETE: Anonimizar usuario pero mantener el registro
      const timestamp = Date.now();
      await userRepository.update(id, {
        isDeleted: true,
        deletedAt: new Date(),
        originalName: user.name, // Guardar para auditoría interna
        name: "Usuario Eliminado",
        email: `deleted_${id}_${timestamp}@sistema.internal`,
        password: "account-disabled-no-access"
      });

      // 4. ¡NO eliminar el usuario! Solo lo marcamos como eliminado
      // Las partidas mantienen la referencia original al ID
      
      return true;
    });
  }

  /**
   * Obtener todos los usuarios incluyendo los eliminados (para matches históricos)
   */
  async findAllIncludingDeleted(): Promise<User[]> {
    return await this.repository.find({
      relations: ['inscriptions']
    });
  }

  /**
   * Buscar usuario por ID incluyendo eliminados (para mostrar en partidas)
   */
  async findByIdIncludingDeleted(id: number): Promise<User | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['inscriptions']
    });
  }

  /**
   * Obtener usuarios activos solamente (para listas públicas)
   */
  async findActiveUsers(): Promise<User[]> {
    return await this.repository.find({
      where: { isDeleted: false },
      relations: ['inscriptions']
    });
  }

  /**
   * Obtener información del usuario especial para usuarios eliminados (LEGACY)
   */
  static getDeletedUserInfo(): { id: number; name: string; isDeleted: boolean } {
    return {
      id: DELETED_USER_ID,
      name: "Usuario Eliminado", 
      isDeleted: true
    };
  }

  /**
   * Verificar si un ID corresponde a un usuario eliminado (LEGACY)
   */
  static isDeletedUser(userId: number): boolean {
    return userId === DELETED_USER_ID;
  }
}