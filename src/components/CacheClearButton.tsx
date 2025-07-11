import React, { useState } from 'react';
import { CacheManagerService } from '../services/imageSearch/CacheManagerService';

interface CacheClearButtonProps {
  variant?: 'full' | 'problematic';
  className?: string;
}

/**
 * キャッシュクリアボタンコンポーネント
 * 表紙画像のミスマッチ問題解決用
 */
export const CacheClearButton: React.FC<CacheClearButtonProps> = ({ 
  variant = 'problematic', 
  className = '' 
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const cacheManager = CacheManagerService.getInstance();

  const handleCacheClear = async () => {
    setIsClearing(true);
    
    try {
      if (variant === 'full') {
        cacheManager.clearAllCaches();
        alert('全キャッシュをクリアしました。ページをリロードしてください。');
        window.location.reload();
      } else {
        cacheManager.clearProblematicBookCaches();
        setLastCleared(new Date().toLocaleTimeString());
        alert('問題のある書籍のキャッシュをクリアしました。');
      }
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
      alert('キャッシュクリアに失敗しました。');
    } finally {
      setIsClearing(false);
    }
  };

  const handleDebugInfo = () => {
    cacheManager.debugCacheInfo();
    alert('コンソールにキャッシュ情報を出力しました。F12を押して確認してください。');
  };

  if (variant === 'full') {
    return (
      <button 
        className={`admin-button ${className}`}
        onClick={handleCacheClear}
        disabled={isClearing}
        style={{ marginRight: '10px' }}
      >
        {isClearing ? '🧹 クリア中...' : '🧹 全キャッシュクリア'}
      </button>
    );
  }

  return (
    <div className={`cache-clear-section ${className}`}>
      <h4 style={{ color: '#2d4a3d', marginBottom: '15px' }}>
        🔧 表紙画像ミスマッチ解決ツール
      </h4>
      
      <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: '#666' }}>
        <strong>🚨 著者・タイトル不一致問題の緊急修復</strong><br/>
        表紙画像と著者・タイトルが合わない場合は、以下のボタンで即座に修復：
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          className="secondary-button"
          onClick={handleCacheClear}
          disabled={isClearing}
          style={{ fontSize: '0.9rem', padding: '8px 16px' }}
        >
{isClearing ? '🧹 Vision検証で修復中...' : '🧹 著者・タイトル不一致を修復'}
        </button>
        
        <button 
          className="secondary-button"
          onClick={handleDebugInfo}
          style={{ 
            fontSize: '0.9rem', 
            padding: '8px 16px',
            background: 'linear-gradient(145deg, #e8f5e8, #d4e5d4)' 
          }}
        >
          🔍 デバッグ情報
        </button>
        
        {lastCleared && (
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            最終修復: {lastCleared}
          </span>
        )}
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        fontSize: '0.8rem', 
        color: '#888',
        fontStyle: 'italic' 
      }}>
        ※ 修復後も問題が続く場合は、ページをリロード（F5）してください
      </div>
    </div>
  );
};