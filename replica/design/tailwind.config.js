// 생성 파일. tokens.json의 역할 이름을 Tailwind theme에 매핑. 클래스 예: bg-surface text-text-muted border-border
module.exports = {
  theme: {
    colors: {
      "bg": "var(--c-bg)",
      "surface": "var(--c-surface)",
      "surface-2": "var(--c-surface-2)",
      "border": "var(--c-border)",
      "border-input": "var(--c-border-input)",
      "text": "var(--c-text)",
      "text-muted": "var(--c-text-muted)",
      "accent": "var(--c-accent)",
      "on-accent": "var(--c-on-accent)",
      "accent-soft": "var(--c-accent-soft)",
      "danger": "var(--c-danger)",
      "success": "var(--c-success)",
      "warning": "var(--c-warning)",
      "warning-soft": "var(--c-warning-soft)",
      "start": "var(--c-start)",
      "end": "var(--c-end)",
      "fav": "var(--c-fav)",
      "walk": "var(--c-walk)",
      "scrim": "var(--c-scrim)"
},
    fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] },
    fontSize: {
      "xs": [
            "12px",
            {
                  "lineHeight": "16px",
                  "fontWeight": "600"
            }
      ],
      "sm": [
            "13px",
            {
                  "lineHeight": "18px",
                  "fontWeight": "400"
            }
      ],
      "base": [
            "15px",
            {
                  "lineHeight": "22px",
                  "fontWeight": "400"
            }
      ],
      "md": [
            "16px",
            {
                  "lineHeight": "22px",
                  "fontWeight": "600"
            }
      ],
      "lg": [
            "18px",
            {
                  "lineHeight": "24px",
                  "fontWeight": "700"
            }
      ],
      "xl": [
            "22px",
            {
                  "lineHeight": "28px",
                  "fontWeight": "700"
            }
      ],
      "display": [
            "28px",
            {
                  "lineHeight": "34px",
                  "fontWeight": "700"
            }
      ],
      "driver-zh": [
            "64px",
            {
                  "lineHeight": "72px",
                  "fontWeight": "800"
            }
      ],
      "driver-addr": [
            "30px",
            {
                  "lineHeight": "38px",
                  "fontWeight": "700"
            }
      ]
},
    spacing: {
      "0": "0px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
      "5": "20px",
      "6": "24px",
      "7": "32px",
      "8": "48px"
},
    borderRadius: {
      "sm": "8px",
      "md": "12px",
      "lg": "16px",
      "sheet": "20px",
      "pill": "999px"
},
    boxShadow: {
      "card": "0 1px 2px rgba(11,16,23,.06), 0 2px 8px rgba(11,16,23,.08)",
      "float": "0 4px 16px rgba(11,16,23,.16)",
      "sheet": "0 -8px 30px rgba(11,16,23,.22)"
},
  },
};
