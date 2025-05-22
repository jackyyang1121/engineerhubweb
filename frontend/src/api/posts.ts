// 重新導出 postApi 中的所有方法，以解決導入問題
export * from './postApi';

// 導入並重命名某些方法
import * as postApi from './postApi';

// 重新導出為 postsAPI 對象，保持與 HomePage.tsx 中的使用方式一致
export const postsAPI = postApi;

// 提供默認導出
export default postApi; 