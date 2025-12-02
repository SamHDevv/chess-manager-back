import { UserRepository } from "../repositories/UserRepository";
import { User } from "../entities/User";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  /**
   * Crear usuario - Para registro público
   * ELO inicial: 1500 (estándar FIDE para principiantes)
   */
  async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: "admin" | "player";
  }): Promise<User> {
    // Validaciones de negocio
    if (!userData.name || !userData.email || !userData.password) {
      throw new Error("El nombre, email y contraseña son obligatorios");
    }

    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("El email ya está en uso");
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error("Formato de email inválido");
    }

    // Validar contraseña
    if (userData.password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    // TODO: Hash password before saving
    // userData.password = await bcrypt.hash(userData.password, 10);

    return await this.userRepository.create({
      ...userData,
      role: userData.role || "player",
      elo: 1500 // ELO inicial estándar (FIDE rating para principiantes)
    });
  }

  /**
   * Actualizar perfil de usuario
   * NOTA: El campo ELO se ignora automáticamente por seguridad
   */
  async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error("Usuario no encontrado");
    }

    // Si se está actualizando el email, verificar que no exista
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = await this.userRepository.findByEmail(userData.email);
      if (emailExists) {
        throw new Error("El email ya está en uso");
      }
    }

    // Prevenir actualización de ELO a través de updateUser
    // El ELO solo se actualiza mediante sistema de partidas (implementación futura)
    const { elo, ...safeUserData } = userData;
    
    if (elo !== undefined) {
      console.warn(`⚠️ Intento de actualizar ELO ignorado. El ELO se actualiza automáticamente según resultados.`);
    }

    return await this.userRepository.update(id, safeUserData);
  }

  /**
   * Actualizar ELO de un usuario
   * ⚠️ SOLO para uso interno del sistema
   * - Llamado automáticamente después de cada partida
   * - Calcula nuevo ELO basado en resultado
   */
  async updateUserElo(id: number, newElo: number, reason?: string): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error("Usuario no encontrado");
    }

    // Validar ELO
    if (newElo < 0 || newElo > 4000) {
      throw new Error("El ELO debe estar entre 0 y 4000");
    }

    console.log(`📊 ELO actualizado: ${existingUser.name} (ID: ${id}): ${existingUser.elo} → ${newElo}${reason ? ` - ${reason}` : ''}`);

    return await this.userRepository.update(id, { elo: newElo });
  }

  /**
   * Obtener información sobre qué se verá afectado al eliminar el usuario
   */
  async getUserDeletionInfo(id: number): Promise<{
    canDelete: boolean;
    warnings: string[];
    affectedItems: {
      tournaments: number;
      inscriptions: number;
      matches: number;
    }
  }> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error("Usuario no encontrado");
    }

    const relations = await this.userRepository.checkUserRelations(id);
    
    const warnings = [];
    if (relations.hasInscriptions) {
      warnings.push("Se eliminarán tus inscripciones a torneos activos");
    }
    if (relations.hasCreatedTournaments) {
      warnings.push("Tus torneos se transferirán automáticamente a un administrador");
    }
    if (relations.hasMatches) {
      warnings.push("Tu historial de partidas se conservará pero se anonimizará tu perfil");
    }

    return {
      canDelete: true, // Siempre permitir eliminación con manejo automático
      warnings,
      affectedItems: {
        tournaments: relations.hasCreatedTournaments ? 1 : 0, // Simplificado por ahora
        inscriptions: relations.hasInscriptions ? 1 : 0,
        matches: relations.hasMatches ? 1 : 0
      }
    };
  }

  /**
   * Eliminar usuario con manejo automático de relaciones
   */
  async deleteUser(id: number): Promise<boolean> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error("Usuario no encontrado");
    }

    // Eliminación inteligente con manejo automático
    return await this.userRepository.deleteUserSafely(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }
}