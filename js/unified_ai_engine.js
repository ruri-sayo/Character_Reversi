/**
 * Reversi: Character Duel - Unified AI Engine v1.0
 * 統合AIエンジン - 全キャラクターを単一のパラメータ化されたロジックで動作
 * 
 * 機能:
 * - 反復深化探索
 * - α-β枝刈り
 * - 終盤読み切り
 * - Move Ordering
 * - フェーズ別評価関数
 * - 後方互換性のある設定読み込み
 */

class UnifiedAIEngine {

    // ========== 定数 ==========

    /** 位置評価テーブル（研究ベース） */
    static POSITION_WEIGHTS = [
        [500, -150, 30, 10, 10, 30, -150, 500],
        [-150, -250, 0, 0, 0, 0, -250, -150],
        [30, 0, 1, 2, 2, 1, 0, 30],
        [10, 0, 2, 16, 16, 2, 0, 10],
        [10, 0, 2, 16, 16, 2, 0, 10],
        [30, 0, 1, 2, 2, 1, 0, 30],
        [-150, -250, 0, 0, 0, 0, -250, -150],
        [500, -150, 30, 10, 10, 30, -150, 500]
    ];

    /** フェーズ判定の閾値 */
    static PHASE_THRESHOLDS = {
        opening: 20,   // 1-20手目
        midgame: 44,   // 21-44手目
        endgame: 60    // 45-60手目
    };

    // ========== コンストラクタ ==========

    constructor() {
        this.startTime = 0;
        this.nodesSearched = 0;
        this.currentConfig = null;
        this.debugMode = false;
    }

    // ========== メインエントリーポイント ==========

    /**
     * 最善手を計算する
     * @param {number[][]} board - 盤面 (0=空, 1=黒, -1=白)
     * @param {number} turn - 手番 (1 or -1)
     * @param {Object} config - キャラクター設定
     * @returns {Promise<{r: number, c: number}>} 最善手
     */
    async computeMove(board, turn, config) {
        this.startTime = Date.now();
        this.nodesSearched = 0;
        this.currentConfig = this._normalizeConfig(config);

        const emptyCount = this._countEmpty(board);
        const currentTurn = 64 - emptyCount - 4 + 1;
        const phase = this._getPhase(currentTurn);

        if (this.debugMode) {
            console.log(`[UnifiedAI] Turn: ${currentTurn}, Phase: ${phase}, Empty: ${emptyCount}`);
            console.log(`[UnifiedAI] Config:`, this.currentConfig);
        }

        // 合法手取得
        const validMoves = GameCore.getValidMoves(board, turn);
        if (validMoves.length === 0) return null;
        if (validMoves.length === 1) return validMoves[0];

        let bestMove;

        // 終盤読み切りモード
        if (this.currentConfig.endgameSolverDepth > 0 &&
            emptyCount <= this.currentConfig.endgameSolverDepth) {
            if (this.debugMode) {
                console.log('[UnifiedAI] Mode: Perfect Endgame');
            }
            bestMove = await this._perfectEndgame(board, turn, validMoves);
        } else {
            // 反復深化モード
            if (this.debugMode) {
                console.log('[UnifiedAI] Mode: Iterative Deepening');
            }
            bestMove = await this._iterativeDeepening(board, turn, validMoves, phase);
        }

        if (this.debugMode) {
            console.log(`[UnifiedAI] Result: (${bestMove.r}, ${bestMove.c}), Nodes: ${this.nodesSearched}, Time: ${Date.now() - this.startTime}ms`);
        }

        return bestMove;
    }

    // ========== 探索アルゴリズム ==========

    /**
     * 反復深化探索
     */
    async _iterativeDeepening(board, turn, validMoves, phase) {
        let bestMove = validMoves[0];
        let scoredMoves = [];
        let lastCompletedDepth = 0;

        for (let depth = 1; depth <= this.currentConfig.maxDepth; depth++) {
            if (this._isTimeUp()) {
                if (this.debugMode) {
                    console.log(`[UnifiedAI] Timeout at depth ${depth}`);
                }
                break;
            }

            try {
                scoredMoves = this._searchAtDepth(board, turn, validMoves, depth, phase);
                bestMove = this._selectMove(scoredMoves);
                lastCompletedDepth = depth;
            } catch (e) {
                if (e.message === 'TIMEOUT') {
                    if (this.debugMode) {
                        console.log(`[UnifiedAI] Timeout during depth ${depth}`);
                    }
                    break;
                }
                throw e;
            }
        }

        if (this.debugMode) {
            console.log(`[UnifiedAI] Completed Depth: ${lastCompletedDepth}`);
        }

        return bestMove;
    }

    /**
     * 指定深度での探索
     */
    _searchAtDepth(board, turn, validMoves, depth, phase) {
        const scoredMoves = [];

        // Move Ordering
        const orderedMoves = this.currentConfig.useMoveOrdering
            ? this._orderMoves(board, turn, validMoves)
            : validMoves;

        for (const move of orderedMoves) {
            if (this._isTimeUp()) throw new Error('TIMEOUT');

            const nextBoard = GameCore.simulateMove(board, move.r, move.c, turn);
            const score = this._negamax(
                nextBoard, depth - 1, -Infinity, Infinity, false, turn, phase
            );
            scoredMoves.push({ ...move, score });
        }

        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves;
    }

    /**
     * NegaMax探索（α-β枝刈り付き）
     */
    _negamax(board, depth, alpha, beta, isMaximizing, aiTurn, phase) {
        this.nodesSearched++;

        if (depth === 0 || this._isTimeUp()) {
            return this._evaluate(board, aiTurn, phase);
        }

        const turnOwner = isMaximizing ? aiTurn : -aiTurn;
        const validMoves = GameCore.getValidMoves(board, turnOwner);

        if (validMoves.length === 0) {
            // パス判定
            const opponentMoves = GameCore.getValidMoves(board, -turnOwner);
            if (opponentMoves.length === 0) {
                // ゲーム終了
                return this._evaluateFinal(board, aiTurn);
            }
            return this._negamax(board, depth - 1, alpha, beta, !isMaximizing, aiTurn, phase);
        }

        // Move Ordering（深い探索時のみ）
        const orderedMoves = (this.currentConfig.useMoveOrdering && depth >= 2)
            ? this._orderMoves(board, turnOwner, validMoves)
            : validMoves;

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of orderedMoves) {
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._negamax(nextBoard, depth - 1, alpha, beta, false, aiTurn, phase);
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of orderedMoves) {
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._negamax(nextBoard, depth - 1, alpha, beta, true, aiTurn, phase);
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    /**
     * 終盤完全読み
     */
    async _perfectEndgame(board, turn, validMoves) {
        const scoredMoves = [];

        // 終盤は角優先でOrdering
        const orderedMoves = this._orderMoves(board, turn, validMoves);

        for (const move of orderedMoves) {
            if (this._isTimeUp()) break;

            const nextBoard = GameCore.simulateMove(board, move.r, move.c, turn);
            const score = this._negamaxEndgame(nextBoard, -Infinity, Infinity, false, turn);
            scoredMoves.push({ ...move, score });
        }

        scoredMoves.sort((a, b) => b.score - a.score);
        return this._selectMove(scoredMoves);
    }

    /**
     * 終盤用NegaMax（石差のみ評価）
     */
    _negamaxEndgame(board, alpha, beta, isMaximizing, aiTurn) {
        this.nodesSearched++;

        const turnOwner = isMaximizing ? aiTurn : -aiTurn;
        const validMoves = GameCore.getValidMoves(board, turnOwner);

        if (validMoves.length === 0) {
            const opponentMoves = GameCore.getValidMoves(board, -turnOwner);
            if (opponentMoves.length === 0) {
                // ゲーム終了 - 石差を返す
                return this._evaluateFinal(board, aiTurn);
            }
            return this._negamaxEndgame(board, alpha, beta, !isMaximizing, aiTurn);
        }

        // 終盤はMove Ordering必須
        const orderedMoves = this._orderMoves(board, turnOwner, validMoves);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of orderedMoves) {
                if (this._isTimeUp()) return maxEval;
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._negamaxEndgame(nextBoard, alpha, beta, false, aiTurn);
                maxEval = Math.max(maxEval, evalVal);
                alpha = Math.max(alpha, evalVal);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of orderedMoves) {
                if (this._isTimeUp()) return minEval;
                const nextBoard = GameCore.simulateMove(board, move.r, move.c, turnOwner);
                const evalVal = this._negamaxEndgame(nextBoard, alpha, beta, true, aiTurn);
                minEval = Math.min(minEval, evalVal);
                beta = Math.min(beta, evalVal);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // ========== 評価関数 ==========

    /**
     * 盤面評価（フェーズ別重み適用）
     */
    _evaluate(board, aiTurn, phase) {
        const weights = this._getWeights(phase);
        let score = 0;

        // 1. 位置評価
        score += this._evaluatePosition(board, aiTurn) * weights.position;

        // 2. 着手可能数
        score += this._evaluateMobility(board, aiTurn) * weights.mobility;

        // 3. 確定石（stabilityが設定されている場合のみ）
        if (weights.stability && weights.stability > 0) {
            score += this._evaluateStability(board, aiTurn) * weights.stability;
        }

        // 4. 石差
        score += this._evaluateDiscDiff(board, aiTurn) * weights.discDiff;

        // 5. 角評価
        if (weights.corner && weights.corner > 0) {
            score += this._evaluateCorners(board, aiTurn) * weights.corner;
        }

        // 6. フロンティア評価（frontierが設定されている場合のみ）
        if (weights.frontier && weights.frontier > 0) {
            score += this._evaluateFrontier(board, aiTurn) * weights.frontier;
        }

        return score;
    }

    /**
     * 位置評価
     */
    _evaluatePosition(board, aiTurn) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === aiTurn) {
                    score += UnifiedAIEngine.POSITION_WEIGHTS[r][c];
                } else if (board[r][c] === -aiTurn) {
                    score -= UnifiedAIEngine.POSITION_WEIGHTS[r][c];
                }
            }
        }
        return score;
    }

    /**
     * 着手可能数評価
     */
    _evaluateMobility(board, aiTurn) {
        const myMoves = GameCore.getValidMoves(board, aiTurn).length;
        const opMoves = GameCore.getValidMoves(board, -aiTurn).length;
        return myMoves - opMoves;
    }

    /**
     * 確定石評価（強化版 - 角からの連続確定石をカウント）
     */
    _evaluateStability(board, aiTurn) {
        let myStable = 0;
        let opStable = 0;

        // 4つの角からそれぞれ確定石をカウント
        const corners = [
            { r: 0, c: 0, dr: [0, 1, 1], dc: [1, 0, 1] },  // 左上
            { r: 0, c: 7, dr: [0, 1, 1], dc: [-1, 0, -1] }, // 右上
            { r: 7, c: 0, dr: [0, -1, -1], dc: [1, 0, 1] }, // 左下
            { r: 7, c: 7, dr: [0, -1, -1], dc: [-1, 0, -1] } // 右下
        ];

        for (const corner of corners) {
            const owner = board[corner.r][corner.c];
            if (owner === 0) continue;

            // 角自体をカウント
            if (owner === aiTurn) myStable += 3;
            else opStable += 3;

            // 辺方向に連続する確定石をカウント（横方向）
            let c = corner.c + corner.dc[0];
            while (c >= 0 && c < 8 && board[corner.r][c] === owner) {
                if (owner === aiTurn) myStable += 2;
                else opStable += 2;
                c += corner.dc[0];
            }

            // 辺方向に連続する確定石をカウント（縦方向）
            let r = corner.r + corner.dr[1];
            while (r >= 0 && r < 8 && board[r][corner.c] === owner) {
                if (owner === aiTurn) myStable += 2;
                else opStable += 2;
                r += corner.dr[1];
            }
        }

        return myStable - opStable;
    }

    /**
     * フロンティア評価（潜在着手可能数）
     * フロンティア = 空きマスに隣接している石の数
     * フロンティアが少ないほど有利（相手に置ける場所を与えない）
     */
    _evaluateFrontier(board, aiTurn) {
        let myFrontier = 0;
        let opFrontier = 0;

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === 0) continue;

                // この石が空きマスに隣接しているかチェック
                let hasEmptyNeighbor = false;
                for (const [dr, dc] of directions) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === 0) {
                        hasEmptyNeighbor = true;
                        break;
                    }
                }

                if (hasEmptyNeighbor) {
                    if (board[r][c] === aiTurn) myFrontier++;
                    else opFrontier++;
                }
            }
        }

        // フロンティアは少ないほうが良い → 相手のフロンティア - 自分のフロンティア
        return opFrontier - myFrontier;
    }

    /**
     * 石差評価
     */
    _evaluateDiscDiff(board, aiTurn) {
        let myDiscs = 0, opDiscs = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === aiTurn) myDiscs++;
                else if (board[r][c] === -aiTurn) opDiscs++;
            }
        }
        return myDiscs - opDiscs;
    }

    /**
     * 角評価
     */
    _evaluateCorners(board, aiTurn) {
        let score = 0;
        const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
        for (const [r, c] of corners) {
            if (board[r][c] === aiTurn) score += 1;
            else if (board[r][c] === -aiTurn) score -= 1;
        }
        return score;
    }

    /**
     * 最終評価（石差のみ）
     */
    _evaluateFinal(board, aiTurn) {
        return this._evaluateDiscDiff(board, aiTurn) * 1000;
    }

    // ========== 設定処理（後方互換性） ==========

    /**
     * 設定の正規化（後方互換性のため）
     */
    _normalizeConfig(config) {
        // 新フォーマット (ai オブジェクトがある場合)
        if (config.ai) {
            return {
                maxDepth: config.ai.maxDepth || 4,
                timeLimit: config.ai.timeLimit || 2000,
                endgameSolverDepth: config.ai.endgameSolverDepth || 0,
                randomness: config.ai.randomness !== undefined ? config.ai.randomness : 0,
                useMoveOrdering: config.ai.useMoveOrdering || false,
                weights: config.ai.weights || this._getDefaultWeights()
            };
        }

        // 旧フォーマット（後方互換）
        return {
            maxDepth: this._convertDepth(config.depth || 4),
            timeLimit: 2000,
            endgameSolverDepth: this._getEndgameDepthFromOldDepth(config.depth || 4),
            randomness: config.randomness !== undefined ? config.randomness : 0,
            useMoveOrdering: (config.depth || 4) >= 4,
            weights: this._convertLegacyWeights(config)
        };
    }

    /**
     * 旧depthを新maxDepthに変換
     */
    _convertDepth(oldDepth) {
        // 旧depth -> 新maxDepth のマッピング
        const mapping = {
            1: 2,
            2: 3,
            3: 4,
            4: 6
        };
        return mapping[oldDepth] || oldDepth + 2;
    }

    /**
     * 旧depthから終盤読み切り深度を決定
     */
    _getEndgameDepthFromOldDepth(oldDepth) {
        // depth 4 のキャラのみ終盤読み切りを有効化
        if (oldDepth >= 4) return 8;
        if (oldDepth >= 3) return 4;
        return 0;
    }

    /**
     * 旧パラメータを新フォーマットに変換
     */
    _convertLegacyWeights(config) {
        const params = config.parameters || {};

        // dynamic_turn の場合
        if (config.logicType === 'dynamic_turn') {
            const early = params.early || { mobility: 30, position: 10, discDiff: -5 };
            const late = params.late || { mobility: 5, position: 20, discDiff: 100 };

            return {
                opening: {
                    mobility: early.mobility,
                    position: early.position,
                    discDiff: early.discDiff,
                    stability: 0,
                    corner: 50
                },
                midgame: {
                    mobility: (early.mobility + late.mobility) / 2,
                    position: (early.position + late.position) / 2,
                    discDiff: (early.discDiff + late.discDiff) / 2,
                    stability: 10,
                    corner: 50
                },
                endgame: {
                    mobility: late.mobility,
                    position: late.position,
                    discDiff: late.discDiff,
                    stability: 20,
                    corner: 50
                }
            };
        }

        // static の場合
        const m = params.mobility !== undefined ? params.mobility : 30;
        const p = params.position !== undefined ? params.position : 20;
        const d = params.discDiff !== undefined ? params.discDiff : 10;

        return {
            opening: { mobility: m, position: p, discDiff: d, stability: 0, corner: 50 },
            midgame: { mobility: m, position: p, discDiff: d, stability: 10, corner: 50 },
            endgame: { mobility: m, position: p, discDiff: d, stability: 20, corner: 50 }
        };
    }

    /**
     * フェーズ別重みを取得
     */
    _getWeights(phase) {
        return this.currentConfig.weights[phase] || this.currentConfig.weights.midgame;
    }

    /**
     * デフォルト重み
     */
    _getDefaultWeights() {
        return {
            opening: { mobility: 30, position: 20, discDiff: -10, stability: 0, corner: 50 },
            midgame: { mobility: 20, position: 30, discDiff: 10, stability: 10, corner: 50 },
            endgame: { mobility: 5, position: 10, discDiff: 100, stability: 30, corner: 30 }
        };
    }

    // ========== ユーティリティ ==========

    /**
     * フェーズ判定
     */
    _getPhase(currentTurn) {
        if (currentTurn <= UnifiedAIEngine.PHASE_THRESHOLDS.opening) return 'opening';
        if (currentTurn <= UnifiedAIEngine.PHASE_THRESHOLDS.midgame) return 'midgame';
        return 'endgame';
    }

    /**
     * 空きマス数
     */
    _countEmpty(board) {
        let count = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === 0) count++;
            }
        }
        return count;
    }

    /**
     * タイムアウト判定
     */
    _isTimeUp() {
        return Date.now() - this.startTime > this.currentConfig.timeLimit;
    }

    /**
     * Move Ordering（角優先、位置重み順）
     */
    _orderMoves(board, turn, moves) {
        const scored = moves.map(move => {
            let priority = 0;

            // 角は最優先
            if ((move.r === 0 || move.r === 7) && (move.c === 0 || move.c === 7)) {
                priority += 10000;
            }
            // X打ち（角の斜め隣）は後回し
            else if ((move.r === 1 || move.r === 6) && (move.c === 1 || move.c === 6)) {
                priority -= 5000;
            }
            // C打ち（角の隣）も後回し
            else if (
                ((move.r === 0 || move.r === 7) && (move.c === 1 || move.c === 6)) ||
                ((move.r === 1 || move.r === 6) && (move.c === 0 || move.c === 7))
            ) {
                priority -= 3000;
            }

            // 位置重み
            priority += UnifiedAIEngine.POSITION_WEIGHTS[move.r][move.c];

            return { ...move, priority };
        });

        scored.sort((a, b) => b.priority - a.priority);
        return scored;
    }

    /**
     * 手の選択（ランダム性考慮）
     */
    _selectMove(scoredMoves) {
        if (scoredMoves.length === 0) return null;

        const randomness = this.currentConfig.randomness || 0;
        const topN = Math.min(randomness, scoredMoves.length - 1);
        const index = Math.floor(Math.random() * (topN + 1));

        if (this.debugMode && randomness > 0) {
            console.log(`[UnifiedAI] Randomness: Selected Top ${index + 1} of ${topN + 1}`);
        }

        return scoredMoves[index];
    }

    /**
     * デバッグモード設定
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// 旧AIEngine互換のため、AIEngineクラスとしてもエクスポート
// これにより既存コードの変更を最小限に抑える
const AIEngine = UnifiedAIEngine;
