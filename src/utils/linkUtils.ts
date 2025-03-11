/**
 * 将GitHub原始链接转换为GitHub渲染页面链接
 */
export const getDocUrl = (docUrl?: string): string => {
  if (!docUrl) return "#";
  
  // 将GitHub原始链接转换为GitHub渲染页面链接
  if (docUrl.includes('raw.githubusercontent.com')) {
    // 例如: https://raw.githubusercontent.com/AnemoneLab/Anemone-skill/refs/heads/main/rex-swap/skilldoc.md
    // 转换为: https://github.com/AnemoneLab/Anemone-skill/blob/main/rex-swap/skilldoc.md
    return docUrl
      .replace('raw.githubusercontent.com', 'github.com')
      .replace('refs/heads/', 'blob/');
  }
  
  // 默认返回原始链接
  return docUrl;
}; 