/**
 * Reversi: Character Duel - AI Engine (v0.2)
 * キャラクターパラメータ対応版
 */

class AIEngine {
    constructor() {
        this.POSITION_WEIGHTS = [
            [120, -20, 20, 5, 5, 20, -20, 120],
            [-20, -40, -5, -5, -5, -5, -40, -20],
            [20, -5, 15, 3, 3, 15, -5, 20],
            [5, -5, 3, 3, 3, 3, -5, 5],
            [5, -5, 3, 3, 3, 3, -5, 5],
            [20, -5, 15, 3, 3, 15, -5, 20],
            [-20, -40, -5, -5, -5, -5, -40, -20],
            [120, -20, 20, 5, 5, 20, -20, 120]
        ];
    }

    async computeMove(board, turn, config) {
        return new Promise((resolve) => {
            const validMoves = GameCore.getValidMoves(board, turn);
            if (validMoves.length === 0) { resolve(null); return; }
            if (validMoves.length === 1) { resolve(validMoves[0]); return; }

            // 現在のターン数を計算（盤面の埋まり具合から推測）
            const totalDiscs = board.flat().filter(c => c !== 0).length;
            const currentTurn = totalDiscs - 4 + 1; // 初期4枚引いて、1手目からカウント

            const scoredMoves = validMoves.map(move => {
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turn);
                const score = this._minimax(
                    nextBoard, config.depth - 1, -Infinity, Infinity, false, turn, config, currentTurn
                );
                return { ...move, score };
            });

            // スコア高い順
            scoredMoves.sort((a, b) => b.score - a.score);

            // ★性格反映: Randomness (Top N)
            // config.randomness = 0 なら常に最善手
            // config.randomness = 3 なら上位3手からランダム
            let topN = config.randomness || 0;
            if (topN >= scoredMoves.length) topN = scoredMoves.length - 1;

            const selectedIndex = Math.floor(Math.random() * (topN + 1));

            // v1.4 Debug Log
            console.log(`Turn: ${currentTurn} | Selected: Top ${selectedIndex + 1} (of ${topN + 1})`);
            console.log('Top Moves:', scoredMoves.slice(0, topN + 1));

            resolve(scoredMoves[selectedIndex]);
        });
    }

    _minimax(board, depth, alpha, beta, isMaximizing, aiTurn, config, currentTurn) {
        if (depth === 0) {
            return this._evaluate(board, aiTurn, config, currentTurn);
        }

        const turnOwner = isMaximizing ? aiTurn : -aiTurn;
        const validMoves = GameCore.getValidMoves(board, turnOwner);

        if (validMoves.length === 0) {
            const opponentMoves = GameCore.getValidMoves(board, -turnOwner);
            if (opponentMoves.length === 0) {
                return this._evaluate(board, aiTurn, config, currentTurn);
            }
            return this._minimax(board, depth - 1, alpha, beta, !isMaximizing, aiTurn, config, currentTurn);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of validMoves) {
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._minimax(nextBoard, depth - 1, alpha, beta, false, aiTurn, config, currentTurn + 1);
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of validMoves) {
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._minimax(nextBoard, depth - 1, alpha, beta, true, aiTurn, config, currentTurn + 1);
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // ★今回のキモ: パラメータ取得ロジック
    _getWeights(config, currentTurn) {
        // Hybridキャラ対応 (dynamic_turn)
        if (config.logicType === 'dynamic_turn') {
            const p = config.parameters;
            if (currentTurn >= p.switchTurn) {
                return p.late; // 後半パラメータ
            } else {
                return p.early; // 前半パラメータ
            }
        }
        // 通常キャラ
        return config.parameters;
    }

    _evaluate(board, aiTurn, config, currentTurn) {
        // 現在のターン数に応じた重みを取得
        const weights = this._getWeights(config, currentTurn);

        let myDiscs = 0;
        let opDiscs = 0;
        let posScore = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const cell = board[r][c];
                if (cell === aiTurn) {
                    myDiscs++;
                    posScore += this.POSITION_WEIGHTS[r][c];
                } else if (cell === -aiTurn) {
                    opDiscs++;
                    posScore -= this.POSITION_WEIGHTS[r][c];
                }
            }
        }

        // Mobility（着手可能数）の計算
        const myMoves = GameCore.getValidMoves(board, aiTurn).length;
        const opMoves = GameCore.getValidMoves(board, -aiTurn).length;

        const mobilityScore = (myMoves - opMoves);
        const discDiff = (myDiscs - opDiscs);

        // 重み付け計算
        let totalScore = 0;
        totalScore += (weights.position * posScore);
        totalScore += (weights.mobility * mobilityScore);
        totalScore += (weights.discDiff * discDiff);

        return totalScore;
    }
}