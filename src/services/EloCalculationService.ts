/**
 * Servicio para calcular cambios de ELO según el sistema FIDE
 * Basado en la fórmula oficial de rating ELO
 */

export class EloCalculationService {
  /**
   * Calcula el nuevo ELO para ambos jugadores después de una partida
   * 
   * @param player1Elo - ELO actual del jugador 1 (blancas)
   * @param player2Elo - ELO actual del jugador 2 (negras)
   * @param result - Resultado de la partida: "white_wins", "black_wins", "draw"
   * @param kFactor - Factor K (por defecto 32 para jugadores estándar)
   * @returns Nuevos ELOs para ambos jugadores
   */
  static calculateNewElos(
    player1Elo: number,
    player2Elo: number,
    result: "white_wins" | "black_wins" | "draw",
    kFactor: number = 32
  ): { player1NewElo: number; player2NewElo: number } {
    
    // Calcular el score de cada jugador
    let player1Score: number;
    let player2Score: number;

    switch (result) {
      case "white_wins":
        player1Score = 1;
        player2Score = 0;
        break;
      case "black_wins":
        player1Score = 0;
        player2Score = 1;
        break;
      case "draw":
        player1Score = 0.5;
        player2Score = 0.5;
        break;
      default:
        throw new Error("Resultado inválido");
    }

    // Calcular el score esperado para cada jugador
    const player1Expected = this.calculateExpectedScore(player1Elo, player2Elo);
    const player2Expected = this.calculateExpectedScore(player2Elo, player1Elo);

    // Calcular el cambio de ELO
    const player1Change = Math.round(kFactor * (player1Score - player1Expected));
    const player2Change = Math.round(kFactor * (player2Score - player2Expected));

    // Calcular nuevos ELOs
    const player1NewElo = Math.round(player1Elo + player1Change);
    const player2NewElo = Math.round(player2Elo + player2Change);

    // Asegurar que los ELOs no sean negativos
    return {
      player1NewElo: Math.max(0, player1NewElo),
      player2NewElo: Math.max(0, player2NewElo)
    };
  }

  /**
   * Calcula el score esperado de un jugador contra otro
   * Fórmula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
   * 
   * @param playerElo - ELO del jugador
   * @param opponentElo - ELO del oponente
   * @returns Score esperado (entre 0 y 1)
   */
  private static calculateExpectedScore(playerElo: number, opponentElo: number): number {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  }

  /**
   * Determina el factor K apropiado según el ELO del jugador
   * - Principiantes (< 2100): K = 40
   * - Jugadores estándar (2100-2400): K = 32
   * - Maestros (> 2400): K = 24
   * 
   * @param playerElo - ELO del jugador
   * @returns Factor K apropiado
   */
  static getKFactor(playerElo: number): number {
    if (playerElo < 2100) {
      return 40; // Mayor volatilidad para jugadores en desarrollo
    } else if (playerElo < 2400) {
      return 32; // Estándar
    } else {
      return 24; // Menor volatilidad para maestros
    }
  }

  /**
   * Calcula el cambio de ELO con K-factor dinámico
   * (considera el nivel de cada jugador para el factor K)
   * 
   * @param player1Elo - ELO del jugador 1
   * @param player2Elo - ELO del jugador 2
   * @param result - Resultado de la partida
   * @returns Nuevos ELOs con K-factor dinámico
   */
  static calculateNewElosWithDynamicK(
    player1Elo: number,
    player2Elo: number,
    result: "white_wins" | "black_wins" | "draw"
  ): { player1NewElo: number; player2NewElo: number; player1Change: number; player2Change: number } {
    
    const k1 = this.getKFactor(player1Elo);
    const k2 = this.getKFactor(player2Elo);

    // Calcular scores
    let player1Score: number;
    let player2Score: number;

    switch (result) {
      case "white_wins":
        player1Score = 1;
        player2Score = 0;
        break;
      case "black_wins":
        player1Score = 0;
        player2Score = 1;
        break;
      case "draw":
        player1Score = 0.5;
        player2Score = 0.5;
        break;
      default:
        throw new Error("Resultado inválido");
    }

    // Calcular scores esperados
    const player1Expected = this.calculateExpectedScore(player1Elo, player2Elo);
    const player2Expected = this.calculateExpectedScore(player2Elo, player1Elo);

    // Calcular cambios con K-factor individual
    const player1Change = Math.round(k1 * (player1Score - player1Expected));
    const player2Change = Math.round(k2 * (player2Score - player2Expected));

    // Calcular nuevos ELOs
    const player1NewElo = Math.max(0, Math.round(player1Elo + player1Change));
    const player2NewElo = Math.max(0, Math.round(player2Elo + player2Change));

    return {
      player1NewElo,
      player2NewElo,
      player1Change,
      player2Change
    };
  }

  /**
   * Calcula la probabilidad de que el jugador 1 gane contra el jugador 2
   * 
   * @param player1Elo - ELO del jugador 1
   * @param player2Elo - ELO del jugador 2
   * @returns Probabilidad de victoria (0-100%)
   */
  static calculateWinProbability(player1Elo: number, player2Elo: number): number {
    const expected = this.calculateExpectedScore(player1Elo, player2Elo);
    return Math.round(expected * 100);
  }
}
