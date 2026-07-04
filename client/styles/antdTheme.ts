import { generate } from '@ant-design/colors'
import type { ThemeConfig } from 'antd'

/**
 * antd 5 主题配置，替代原 styles/theme.less 的 less 变量覆盖。
 * token 映射依据 design/antd从4.x升级到5.x版本.md 第五节，
 * 仅列出与 v5 默认值不同的项，与默认一致或可自动派生的项省略。
 */

const primaryColor = '#2395f1'

// 等价于 v4 的 @primary-1（colorPalette(@primary-color, 1)），用于 hover 浅色背景
const primary1 = generate(primaryColor)[0]

const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: primaryColor,
    colorInfo: primaryColor,
    colorSuccess: '#57cf27',
    colorError: '#ff561b',
    colorWarning: '#fac200',
    colorLink: primaryColor,
    fontSize: 13, // v5 默认 14
    fontSizeLG: 16, // v5 默认 fontSize + 2 = 15
    borderRadius: 4, // v5 默认 6
    borderRadiusSM: 2, // v5 默认 4
    colorText: 'rgba(13, 27, 62, 0.65)', // 原 fade(#0d1b3e, 65%)
    colorTextSecondary: 'rgba(13, 27, 62, 0.43)',
    colorTextHeading: 'rgba(39, 56, 72, 0.85)', // 原 fade(#273848, 85%)
    colorTextDisabled: 'rgba(13, 27, 62, 0.45)',
    controlHeightLG: 36, // v5 默认 40
    controlHeightSM: 26, // v5 默认 24
    colorBgMask: 'rgba(55, 55, 55, 0.6)',
    colorSplit: '#e9e9e9', // v5 默认半透明黑，表格分割线可感知
    colorBgSpotlight: 'rgba(64, 64, 64, 0.85)', // Tooltip 背景
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
  },
  components: {
    Layout: {
      bodyBg: '#eceef1',
      headerBg: '#32363a',
      headerHeight: 56,
      headerPadding: 0,
      siderBg: '#fff',
    },
    Menu: {
      // 顶栏用户菜单 <Menu theme="dark"> 用到
      darkItemBg: '#32363a',
      darkSubMenuItemBg: '#333',
    },
    Table: {
      headerBg: '#eee',
      rowHoverBg: primary1,
    },
    Card: {
      headerHeight: 48, // v5 默认 56
    },
    Form: {
      labelRequiredMarkColor: '#ff561b',
    },
    Input: {
      addonBg: '#eee',
    },
    Tag: {
      defaultBg: '#f3f3f3',
    },
    Spin: {
      dotSize: 23,
      dotSizeSM: 16,
      dotSizeLG: 36,
    },
  },
}

export default antdTheme
