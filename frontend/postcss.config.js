export default {
  plugins: {
    '@tailwindcss/postcss': {},
    //這是 Tailwind CSS 的 PostCSS 插件，用於處理 Tailwind 的樣式功能。這裡使用空物件 {}，表示採用插件的預設配置，沒有額外的自訂選項。
    autoprefixer: {},
    //這是 Autoprefixer 插件，用來自動為 CSS 屬性添加瀏覽器前綴（例如 -webkit-、-moz-），以確保跨瀏覽器的兼容性，每個瀏覽器都能運作。空物件 {} 表示使用預設配置。

    //不同的網頁瀏覽器（例如 Chrome、Firefox、Safari、Edge、舊版 Internet Explorer 等）在實現 CSS 標準時可能有差異。
    //有些 CSS 屬性或功能在某些瀏覽器中需要添加特定的前綴（vendor prefixes），例如 -webkit-（適用於 Chrome、Safari 等 WebKit 引擎）、-moz-（適用於 Firefox）、-ms-（適用於舊版 Microsoft 瀏覽器）等，才能正確運作。
  },
} 