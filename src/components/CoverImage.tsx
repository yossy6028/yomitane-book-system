import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Book } from '../types/Book';
import { normalizeImagePath, isValidImagePath } from '../utils/imageUtils';
import { coverImageAutoFetcher } from '../services/coverImageAutoFetcher';

type FetchReason = 'missing' | 'error';

interface CoverImageProps {
  book: Book;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/**
 * 書籍表紙画像コンポーネント（最適化版）
 * シンプルで信頼性の高い実装
 */
export const CoverImage: React.FC<CoverImageProps> = ({ 
  book, 
  className = '', 
  size = 'medium',
  onImageLoad,
  onImageError 
}) => {
  const [hasImageError, setHasImageError] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const attemptedReasonsRef = useRef<Set<FetchReason>>(new Set<FetchReason>());
  const attemptedUrlsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const defaultImage = useMemo(() => {
    const publicUrl = process.env.PUBLIC_URL || '';
    const cleanedPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
    return cleanedPublicUrl + '/images/default-cover.svg';
  }, []);

  // 画像パスを正規化
  const normalizedPath = useMemo(() => normalizeImagePath(book.coverImage), [book.coverImage]);
  const isValid = useMemo(() => isValidImagePath(normalizedPath), [normalizedPath]);

  // PUBLIC_URLを考慮した画像パス
  const imagePath = useMemo(() => {
    if (!normalizedPath) {
      return '';
    }
    // 既にhttpで始まる場合はそのまま返す
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      return normalizedPath;
    }
    // ローカルパスの場合、PUBLIC_URLを考慮（通常は空文字列または/）
    const publicUrl = process.env.PUBLIC_URL || '';
    // PUBLIC_URLの末尾のスラッシュを削除してから結合
    const cleanedPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
    // パスが/で始まる場合、PUBLIC_URLと結合
    if (normalizedPath.startsWith('/')) {
      return cleanedPublicUrl + normalizedPath;
    }
    return normalizedPath;
  }, [normalizedPath]);

  const initialSrc = useMemo(() => {
    const shouldUseImage = isValid && book.coverImage;
    const src = shouldUseImage ? imagePath : defaultImage;
    
    // デバッグ用ログ（開発環境のみ）
    if (process.env.NODE_ENV === 'development' && !shouldUseImage && book.coverImage) {
      console.warn(`[CoverImage] デフォルト画像を使用: ${book.title}`, {
        coverImage: book.coverImage,
        normalizedPath: normalizedPath,
        isValid: isValid,
        imagePath: imagePath
      });
    }
    
    return src;
  }, [book.coverImage, book.title, defaultImage, imagePath, isValid, normalizedPath]);

  const [imageSrc, setImageSrc] = useState(initialSrc);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    attemptedReasonsRef.current.clear();
    attemptedUrlsRef.current.clear();
    setHasImageError(false);
    setIsAutoFetching(false);
    setImageSrc(initialSrc);
  }, [book.id, initialSrc]);

  // :3000を含む不完全なパスの検出
  useEffect(() => {
    if (normalizedPath.includes(':3000')) {
      console.error(`[CoverImage] MALFORMED PATH DETECTED for ${book.title}:`, {
        original: book.coverImage,
        normalized: normalizedPath,
        problem: 'Path contains :3000 without protocol'
      });
    }
  }, [book.coverImage, book.title, normalizedPath]);

  const attemptAutoFetch = useCallback(
    async (reason: 'missing' | 'error') => {
      if (attemptedReasonsRef.current.has(reason) || isAutoFetching) {
        return;
      }

      attemptedReasonsRef.current.add(reason);
      setIsAutoFetching(true);

      try {
        const fetchedUrl = await coverImageAutoFetcher.fetchAndCacheCover(book, reason);
        if (!fetchedUrl || attemptedUrlsRef.current.has(fetchedUrl)) {
          return;
        }

        attemptedUrlsRef.current.add(fetchedUrl);

        if (isMountedRef.current) {
          setImageSrc(fetchedUrl);
          setHasImageError(false);
        }
      } catch (autoFetchError) {
        console.error('[CoverImage] 自動表紙取得に失敗しました', {
          bookId: book.id,
          title: book.title,
          reason,
          error: autoFetchError
        });
      } finally {
        if (isMountedRef.current) {
          setIsAutoFetching(false);
        }
        if (!isMountedRef.current) {
          attemptedReasonsRef.current.delete(reason);
        }
      }
    },
    [book, isAutoFetching]
  );

  useEffect(() => {
    const reason: FetchReason = hasImageError ? 'error' : 'missing';
    const needsAutoFetch =
      (!book.coverImage || !isValid || hasImageError) &&
      !attemptedReasonsRef.current.has(reason);
    if (needsAutoFetch) {
      attemptAutoFetch(reason);
    }
  }, [attemptAutoFetch, book.coverImage, hasImageError, isValid]);

  // サイズに応じたクラス名を生成
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'cover-image-small'; // 48x64px
      case 'large':
        return 'cover-image-large'; // 96x128px
      case 'medium':
      default:
        return 'cover-image-medium'; // 80x96px
    }
  };

  const baseClasses = `${getSizeClasses()} cover-image-base`;

  // 画像エラー時の処理
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    console.error('[CoverImage] 画像読み込みエラー', {
      title: book.title,
      originalPath: book.coverImage,
      normalizedPath: normalizedPath,
      isValid: isValid,
      currentSrc: imageSrc,
      defaultImage: defaultImage,
      errorType: e.type
    });
    
    attemptedUrlsRef.current.add(target.src);

    // デフォルト画像でない場合のみ、デフォルト画像に切り替え
    if (imageSrc !== defaultImage) {
      console.log(`[CoverImage] デフォルト画像に切り替え: ${book.title}`);
      setImageSrc(defaultImage);
      setHasImageError(true);
    }

    // 自動取得が未試行の場合はフォールバックで実行
    void attemptAutoFetch('error');

    onImageError?.();
  };

  // 常に画像タグを返す（デフォルト画像を含む）
  return (
    <img 
      src={imageSrc} 
      alt={book.title} 
      className={`${baseClasses} ${className}`}
      onLoad={() => {
        onImageLoad?.();
      }}
      onError={handleImageError}
      loading="lazy"
    />
  );
};