import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../entities/User';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'player';
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export class AuthService {
  private userRepository: UserRepository;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  /**
   * Registrar un nuevo usuario
   */
  async register(userData: RegisterData): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

    // Crear el usuario
    const newUser = await this.userRepository.create({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'player'
    });

    // Generar token
    const token = this.generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    // Retornar usuario sin contraseña y token
    const { password, ...userWithoutPassword } = newUser;
    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Iniciar sesión
   */
  async login(credentials: LoginCredentials): Promise<{ user: Omit<User, 'password'>, token: string }> {
    // Buscar usuario por email
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Retornar usuario sin contraseña y token
    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Verificar token JWT
   */
  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }

  /**
   * Generar token JWT
   */
  private generateToken(payload: TokenPayload): string {
    return jwt.sign(
      payload as jwt.JwtPayload, 
      this.jwtSecret, 
      { expiresIn: this.jwtExpiresIn }
    );
  }

  /**
   * Obtener usuario por ID (para middleware de autenticación)
   */
  async getUserById(userId: number): Promise<Omit<User, 'password'> | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}