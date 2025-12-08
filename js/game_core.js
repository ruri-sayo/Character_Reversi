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

  // 盤面の初期化
  reset() {
    // 8x8の0埋め配列を作成
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    
    // 初期配置 (中央のクロス)
    const mid = this.rows / 2;
    this.board[mid - 1][mid - 1] = -1; // 白
    this.board[mid][mid] = -1;         // 白
    this.board[mid - 1][mid] = 1;      // 黒
    this.board[mid][mid - 1] = 1;      // 黒

    this.turn = 1; // 黒から開始
    this.gameEnded = false;
  }

  // 指定した手番の合法手（置ける場所）を全て取得
  // 返り値: [{r: 2, c: 3}, ...]
  getValidMoves(turn) {
    const moves = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.canPlace(r, c, turn)) {
          moves.push({ r, c });
        }
      }
    }
    return moves;
  }

  // その場所に置けるか判定
  canPlace(r, c, turn) {
    if (this.board[r][c] !== 0) return false; // 既に石がある

    // 8方向の定義 [dr, dc]
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      if (this.checkDirection(r, c, dr, dc, turn)) {
        return true; // 1方向でも返せればOK
      }
    }
    return false;
  }

  // 特定の方向に対して挟めるかチェック
  checkDirection(r, c, dr, dc, turn) {
    let nr = r + dr;
    let nc = c + dc;
    let hasOpponent = false;

    // 盤面内かつ、相手の石(-turn)である間進む
    while (this.isValidBounds(nr, nc) && this.board[nr][nc] === -turn) {
      hasOpponent = true;
      nr += dr;
      nc += dc;
    }

    // 相手の石を挟んだ先に、自分の石(turn)があれば成功
    if (hasOpponent && this.isValidBounds(nr, nc) && this.board[nr][nc] === turn) {
      return true;
    }
    return false;
  }

  // 着手処理（石を置き、裏返す）
  // 成功すれば true, 失敗(置けない)なら false
  makeMove(r, c, turn) {
    if (!this.canPlace(r, c, turn)) return false;

    // 石を置く
    this.board[r][c] = turn;

    // 裏返す処理
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      if (this.checkDirection(r, c, dr, dc, turn)) {
        let nr = r + dr;
        let nc = c + dc;
        while (this.board[nr][nc] === -turn) {
          this.board[nr][nc] = turn; // 反転
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
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }
}