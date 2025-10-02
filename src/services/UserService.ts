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
      role: userData.role || "player"
    });
  }

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

    return await this.userRepository.update(id, userData);
  }

  async deleteUser(id: number): Promise<boolean> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error("Usuario no encontrado");
    }

    return await this.userRepository.delete(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }
}