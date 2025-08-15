"""
ハンドラーの基底クラス

全てのハンドラーが継承する共通のベースクラスです。
共通のリプライ送信処理や初期化処理を提供します。
"""

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


class BaseHandler:
    """全ハンドラーの基底クラス
    
    各ハンドラーは以下の責任を持ちます：
    - 特定のコマンドタイプの処理
    - 適切なレスポンスの生成
    - エラーハンドリング
    """
    
    def __init__(self, config, database, data_service, bot_client):
        """ハンドラーの初期化
        
        Args:
            config: 設定管理オブジェクト
            database: データベースアクセスオブジェクト
            data_service: データサービスオブジェクト
            bot_client: ボットクライアントオブジェクト（None可能）
        """
        self.config = config
        self.database = database
        self.data_service = data_service
        self.bot_client = bot_client
        
    async def handle(self, note, command: Dict[str, Any]):
        """各ハンドラーで実装必須のメソッド
        
        Args:
            note: Misskeyのnoteオブジェクト
            command: _parse_command()から返されるコマンド情報
        
        Raises:
            NotImplementedError: サブクラスで実装されていない場合
        """
        raise NotImplementedError("各ハンドラ