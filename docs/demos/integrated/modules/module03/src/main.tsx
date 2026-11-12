import React from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { IndividualWorkspace } from './workspace';
import { appTheme } from './theme';
import 'antd/dist/reset.css';
import './style.css';

dayjs.locale('zh-cn');
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={appTheme}>
      <AntApp><IndividualWorkspace /></AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
