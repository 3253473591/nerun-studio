// Tailwind CSS 配置文件
// 定义设计系统颜色变量和字体族，确保与 site-config.json 和自定义 CSS 变量保持一致

tailwind.config = {
  theme: {
    extend: {
      // 扩展颜色配置：定义暗色主题设计系统的完整色板
      // 包含背景色、文字色、链接色、角色专属色等
      colors: {
        "bg-primary": "#1A1B26",      // 主背景色
        "bg-secondary": "#24283B",    // 次级背景（卡片）
        "bg-tertiary": "#414868",     // 三级背景（边框、分割线）
        "text-primary": "#C0CAF5",    // 主文字色
        "text-secondary": "#7AA2F7",  // 次级文字（链接、强调）
        "text-muted": "#565F89",      // 弱化文字（描述、占位符）
        "link": "#2AC3DE",            // 链接主色
        "link-hover": "#73DACA",      // 链接悬停色
      },
      // 字体配置：系统字体栈，确保跨平台一致性
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
}