/**
 * Reversi: Character Duel - AI Worker
 * AIエンジンを別スレッドで実行するWeb Worker
 */

// 必要なスクリプトを読み込み（同じディレクトリから）
importScripts('./game_core.js', './unified_ai_engine.js');

// AIエンジンのインスタンスを作成
const ai = new UnifiedAIEngine();

/**
 * メインスレッドからのメッセージを受信
 * @param {MessageEvent} e - { board, turn, config, requestId }
 */
self.onmessage = async function (e) {
    const { board, turn, config, requestId } = e.data;

    try {
        // AI計算を実行
        const move = await ai.computeMove(board, turn, config);

        // 結果をメインスレッドに返す
        self.postMessage({
            type: 'RESULT',
            move: move,
            requestId: requestId
        });
    } catch (error) {
        // エラー発生時
        self.postMessage({
            type: 'ERROR',
            error: error.message,
            requestId: requestId
        });
    }
};

// Worker起動完了を通知
self.postMessage({ type: 'READY' });
