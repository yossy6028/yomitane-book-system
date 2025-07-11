import React, { useState, useEffect } from 'react';
import { coverImageService } from '../services/coverImageService';

interface CoverImageProps {
  book: any;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * 書籍表紙画像コンポーネント（統一版）
 * すべてのコンポーネントで共通使用
 */
export const CoverImage: React.FC<CoverImageProps> = ({ 
  book, 
  className = '', 
  size = 'medium',
  onImageLoad,
  onImageError 
}) => {
  const [coverImage, setCoverImage] = useState<string>(book.coverImage || '');
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCoverImage = async () => {
      // 既存の画像URLがある場合はそれを使用
      if (book.coverImage && book.coverImage.trim() !== '') {
        if (mounted) setCoverImage(book.coverImage);
        return;
      }

      // 既存の画像がない場合のみ検索
      if (mounted) setIsLoadingImage(true);
      
      try {
        const imageUrl = await coverImageService.getImageForBook(book);
        
        if (mounted) {
          setCoverImage(imageUrl);
          setIsLoadingImage(false);
        }
      } catch (error) {
        console.warn('表紙画像の取得に失敗しました:', error);
        if (mounted) {
          setCoverImage('');
          setHasImageError(true);
          setIsLoadingImage(false);
          onImageError?.();
        }
      }
    };

    loadCoverImage();

    return () => {
      mounted = false;
    };
  }, [book, onImageError]); // eslint-disable-line react-hooks/exhaustive-deps

  // サイズに応じたクラス名を生成
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-12 h-16'; // 48x64px
      case 'large':
        return 'w-24 h-32'; // 96x128px
      case 'medium':
      default:
        return 'w-20 h-24'; // 80x96px
    }
  };

  const baseClasses = `${getSizeClasses()} object-cover border-2 border-gray-200 rounded-lg shadow-sm`;

  if (isLoadingImage) {
    return (
      <div className={`${baseClasses} ${className} bg-gray-100 flex flex-col items-center justify-center text-gray-500 text-xs`}>
        <div className="animate-spin">🔄</div>
        <div className="mt-1">読み込み中</div>
      </div>
    );
  }

  if (coverImage && !hasImageError) {
    return (
      <img 
        src={coverImage} 
        alt={book.title} 
        className={`${baseClasses} ${className}`}
        onLoad={() => {
          setHasImageError(false);
          onImageLoad?.();
        }}
        onError={() => {
          setHasImageError(true);
          onImageError?.();
        }}
      />
    );
  }

  return (
    <div className={`${baseClasses} ${className} bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col items-center justify-center text-gray-600 text-xs p-2`}>
      <div className="text-lg mb-1">📚</div>
      <div className="text-center leading-tight">
        {hasImageError ? 'エラー' : '画像なし'}
      </div>
    </div>
  );
};