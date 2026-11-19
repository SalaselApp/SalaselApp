import type { LanguageCode } from '../types'
export function catalogCopy(lang: LanguageCode) {
  if (lang === 'ar')
    return {
      more: 'تحميل المزيد',
      loading: 'جارٍ التحميل…',
      error: 'تعذّر تحميل المحتوى.',
      retry: 'إعادة المحاولة',
      end: 'وصلت إلى نهاية القائمة',
      empty: 'لا توجد نتائج مطابقة.',
    }
  if (lang === 'ja')
    return {
      more: 'さらに読み込む',
      loading: '読み込み中…',
      error: 'コンテンツを読み込めませんでした。',
      retry: '再試行',
      end: 'すべて表示しました',
      empty: '一致する結果がありません。',
    }
  return {
    more: 'Load more',
    loading: 'Loading…',
    error: 'Could not load content.',
    retry: 'Try again',
    end: 'You reached the end of the list',
    empty: 'No matching results.',
  }
}
