/**
 * Reversi: Character Duel - Game Core
 * リバーシの基本ルール、盤面管理を行うクラス
 */
class GameCore {
  constructor() {
    this.rows = 8;
    this.cols = 8;
    this.board = []; // 2D array: 0=Empty, 1=Black, -1=White
    this.turn = 1;   // 1: Black, -1: White
    this.gameEnded = false;
    this.reset();
  }

  // --- Static Helper Methods (Pure Functions) ---

  // 盤面の複製 (高速化のため map を使用)
  static cloneBoard(board) {
    return board.map(row => [...row]);
  }

  // 範囲チェック
  static isValidBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  // 特定の方向に対して挟めるかチェック
  static checkDirection(board, r, c, dr, dc, turn) {
    let nr = r + dr;
    let nc = c + dc;
    let hasOpponent = false;

    // 盤面内かつ、相手の石(-turn)である間進む
    while (GameCore.isValidBounds(nr, nc) && board[nr][nc] === -turn) {
      hasOpponent = true;
      nr += dr;
      nc += dc;
    }

    // 相手の石を挟んだ先に、自分の石(turn)があれば成功
    if (hasOpponent && GameCore.isValidBounds(nr, nc) && board[nr][nc] === turn) {
      return true;
    }
    return false;
  }

  // その場所に置けるか判定
  static canPlace(board, r, c, turn) {
    if (board[r][c] !== 0) return false;

    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, dc] of directions) {
      if (GameCore.checkDirection(board, r, c, dr, dc, turn)) {
        return true;
      }
    }
    return false;
  }

  // 合法手の取得
  static getValidMoves(board, turn) {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (GameCore.canPlace(board, r, c, turn)) {
          moves.push({ r, c });
        }
      }
    }
    return moves;
  }

  // 仮想的な着手 (新しい盤面を返す) - AI探索用
  static simulateMove(board, r, c, turn) {
    if (!GameCore.canPlace(board, r, c, turn)) return null;

    const newBoard = GameCore.cloneBoard(board);
    newBoard[r][c] = turn;

    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, dc] of directions) {
      if (GameCore.checkDirection(board, r, c, dr, dc, turn)) {
        let nr = r + dr;
        let nc = c + dc;
        while (newBoard[nr][nc] === -turn) {
          newBoard[nr][nc] = turn; // 反転
          nr += dr;
          nc += dc;
        }
      }
    }
    return newBoard;
  }

  // --- Instance Methods ---

  reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));

    const mid = this.rows / 2;
    this.board[mid - 1][mid - 1] = -1;
    this.board[mid][mid] = -1;
    this.board[mid - 1][mid] = 1;
    this.board[mid][mid - 1] = 1;

    this.turn = 1;
    this.gameEnded = false;
  }

  getValidMoves(turn) {
    return GameCore.getValidMoves(this.board, turn);
  }

  canPlace(r, c, turn) {
    return GameCore.canPlace(this.board, r, c, turn);
  }

  checkDirection(r, c, dr, dc, turn) {
    return GameCore.checkDirection(this.board, r, c, dr, dc, turn);
  }

  // 着手処理（石を置き、裏返す）
  // 成功すれば true, 失敗(置けない)なら false
  makeMove(r, c, turn) {
    if (!this.canPlace(r, c, turn)) return false;

    // 内部状態を更新するためのロジック (simulateMoveとほぼ同じだが this.board を操作)
    this.board[r][c] = turn;

    // 裏返す処理
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    for (const [dr, dc] of directions) {
      if (this.checkDirection(r, c, dr, dc, turn)) {
        let nr = r + dr;
        let nc = c + dc;
        while (this.board[nr][nc] === -turn) {
          this.board[nr][nc] = turn;
          nr += dr;
          nc += dc;
        }
      }
    }
    return true;
  }

  // ターン交代
  switchTurn() {
    this.turn *= -1;
  }

  // パス判定 (現在の手番が置ける場所がない)
  hasValidMove(turn) {
    return this.getValidMoves(turn).length > 0;
  }

  // ゲーム終了判定とカウント
  checkGameState() {
    const p1Moves = this.hasValidMove(1);
    const p2Moves = this.hasValidMove(-1);

    // 両者とも置く場所がなければ終了
    if (!p1Moves && !p2Moves) {
      this.gameEnded = true;
    }

    // 石のカウント
    let black = 0;
    let white = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] === 1) black++;
        if (this.board[r][c] === -1) white++;
      }
    }

    return {
      isGameOver: this.gameEnded,
      black,
      white,
      currentTurnHasMove: (this.turn === 1) ? p1Moves : p2Moves
    };
  }

  // 座標が盤面内か
  isValidBounds(r, c) {
    return GameCore.isValidBounds(r, c);
  }
}