/**
 * EngineerHub - 認證狀態管理統一導出接口
 * 
 * 這是一個重新導出文件，用於保持向後兼容性和簡化導入路徑
 * 
 * 設計目的：
 * - 向後兼容性：確保現有組件能正常運行，無需修改導入路徑
 * - 簡化導入：提供更短的導入路徑 '@/store/authStore' 而非 '@/store/auth/index'
 * - 統一接口：作為認證模組的統一訪問入口
 * 
 * 設計原則：
 * - Narrowly focused: 專注於提供統一的導入路徑，不包含具體實現
 * - Flexible: 允許從不同路徑導入 authStore，提高開發體驗
 * - Loosely coupled: 作為中介層，減少路徑耦合，便於未來重構
 * 
 * 使用說明：
 * - 新代碼推薦使用：import { useAuthStore } from '@/store/auth'
 * - 舊代碼可繼續使用：import { useAuthStore } from '@/store/authStore'
 * - 兩種方式功能完全相同，都指向同一個實現
 */

// 重新導出所有認證相關的功能，確保完整的功能可用性
export * from './auth/index';

// 確保默認導出也能正常工作，提供多種導入方式的支援
export { useAuthStore as default } from './auth/index'; 