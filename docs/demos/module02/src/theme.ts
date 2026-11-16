import type { ThemeConfig } from 'antd';
// Match the platform's Ant Design baseline. Component defaults supply semantic colors.
export const appTheme: ThemeConfig = {
  token: { colorPrimary: '#1677ff', borderRadius: 6, fontSize: 14, controlHeight: 32, colorBgLayout: '#f5f6f8' },
  components: { Menu: { itemHeight: 42, itemMarginInline: 8 }, Form: { itemMarginBottom: 16 } },
};
