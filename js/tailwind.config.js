/**
 * Tailwind CSS 配置
 * 如需修改主题颜色，同步更新 css/variables.css
 */
tailwind.config = {
    theme: {
      extend: {
        colors: {
          // 背景层级
          "bg-primary": "#1A1B26",
          "bg-secondary": "#24283B",
          "bg-tertiary": "#414868",
          // 文字色
          "text-primary": "#C0CAF5",
          "text-secondary": "#7AA2F7",
          "text-muted": "#565F89",
          // 功能色
          "link": "#2AC3DE",
          "link-hover": "#73DACA",
          // 工种专属色（必须与 variables.css 保持一致）
          "role-arrangement": "#BB9AF7",
          "role-mixing": "#7AA2F7",
          "role-vocal": "#F7768E",
          "role-tuning": "#F38BA8",
          "role-lyrics": "#9ECE6A",
          "role-mastering": "#E0AF68",
          "role-pv": "#2AC3DE",
        },
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